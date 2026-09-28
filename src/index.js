import PostalMime from 'postal-mime';
import {buildSlots, utcIsoToLocalParts, localDateTimeToUtcIso, DEFAULT_UTC_OFFSET_MINUTES} from './scheduling.js';
import {json,bad,requireAdmin,corsHeaders} from './guards.js';
import {uid,nowIso,getSetting,setSetting,audit,recordError,listServices,getService} from './db.js';
import {medicalRisk,sanitizePublicChatInput,openAiText,transcribeAudio,chatbotInstructions,chooseModel} from './providers/ai.js';
import {sendWhatsAppText,sendWhatsAppTemplateOrText,downloadYCloudMedia,whatsappProvider} from './providers/whatsapp.js';
import {sendEmail} from './providers/email.js';

const DAY_MS=86_400_000;
const lockGranularityMinutes=5;

function slotKeys(startIso,endIso){
  const start=Math.floor(new Date(startIso).getTime()/(lockGranularityMinutes*60_000))*(lockGranularityMinutes*60_000);
  const end=Math.ceil(new Date(endIso).getTime()/(lockGranularityMinutes*60_000))*(lockGranularityMinutes*60_000);
  const out=[];
  for(let t=start;t<end;t+=lockGranularityMinutes*60_000) out.push(new Date(t).toISOString());
  return out;
}
function cleanPhone(v=''){return String(v).replace(/[^0-9]/g,'').slice(0,20)}
function textLimit(v,n=500){return String(v||'').trim().slice(0,n)}
function requestId(request){return request.headers.get('cf-ray')||crypto.randomUUID()}
async function ipHash(request,env){
  const ip=request.headers.get('cf-connecting-ip')||'';
  if(!ip) return null;
  const data=new TextEncoder().encode(`${env.LOG_HASH_SALT||'ydania'}:${ip}`);
  const hash=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
}
function dbRequired(env){if(!env.DB) throw new Error('D1 database is not configured'); return env.DB;}
function parseJsonText(text){
  const cleaned=text.replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  return JSON.parse(cleaned);
}
async function approvedKnowledge(db,language='es'){
  const r=await db.prepare(`SELECT category,title,content FROM knowledge_entries WHERE active=1 AND language IN (?, 'es') ORDER BY category,title LIMIT 80`).bind(language).all();
  return (r.results||[]).map(x=>`[${x.category}] ${x.title}: ${x.content}`).join('\n');
}

async function handleChat(request,env){
  const db=dbRequired(env); const body=await request.json();
  const raw=textLimit(body.message,3000); if(!raw) return bad('Message is required');
  const language=textLimit(body.language||'es',5); const risk=medicalRisk(raw);
  const disclaimer=await getSetting(db,`chat_disclaimer_${language}`,await getSetting(db,'chat_disclaimer_es',''));
  if(risk==='urgent'){
    const msg=language==='es'?'Si existe una posible urgencia médica, no uses este chat para decidir qué hacer. Busca evaluación médica presencial urgente o servicios de emergencia de tu localidad.':'If this may be a medical emergency, do not use this chat to decide what to do. Seek urgent in-person medical evaluation or local emergency services.';
    return json({ok:true,answer:msg,disclaimer,risk,model:null});
  }
  const knowledge=await approvedKnowledge(db,language);
  const safe=sanitizePublicChatInput(raw);
  const history=Array.isArray(body.history)?body.history.slice(-6).map(x=>({role:x.role==='assistant'?'assistant':'user',text:sanitizePublicChatInput(textLimit(x.text,1500))})):[];
  const context=history.length?history.map(x=>`${x.role==='assistant'?'Assistant':'User'}: ${x.text}`).join('\n')+'\nUser: '+safe:safe;
  const result=await openAiText(env,{risk,model:chooseModel(env,{risk,complexity:context.length>1600?'complex':'simple'}),instructions:chatbotInstructions({knowledge,disclaimer}),input:context});
  return json({ok:true,answer:result.text,disclaimer,risk,model:result.model});
}

async function availabilityFor(db,service,date){
  const offset=Number(await getSetting(db,'utc_offset_minutes',DEFAULT_UTC_OFFSET_MINUTES));
  const step=Number(await getSetting(db,'slot_step_minutes',15));
  const rules=(await db.prepare(`SELECT weekday,start_time,end_time,enabled FROM availability_rules WHERE enabled=1`).all()).results||[];
  const dayStart=localDateTimeToUtcIso(date,'00:00',offset);
  const nextDate=new Date(new Date(dayStart).getTime()+DAY_MS).toISOString();
  const busy=(await db.prepare(`SELECT reserve_start_at AS start_at,reserve_end_at AS end_at FROM bookings WHERE deleted_at IS NULL AND status IN ('pending','confirmed') AND reserve_end_at>? AND reserve_start_at<?`).bind(dayStart,nextDate).all()).results||[];
  const blocks=(await db.prepare(`SELECT start_at,end_at FROM blocked_periods WHERE deleted_at IS NULL AND end_at>? AND start_at<?`).bind(dayStart,nextDate).all()).results||[];
  return buildSlots({date,rules,busy,blocks,durationMinutes:service.duration_minutes,bufferBeforeMinutes:service.buffer_before_minutes,bufferAfterMinutes:service.buffer_after_minutes,slotStepMinutes:step,minNoticeMinutes:service.min_notice_minutes,offsetMinutes:offset});
}

async function createBookingRequest(request,env){
  const db=dbRequired(env); const body=await request.json();
  const service=await getService(db,body.service_id||body.service_slug); if(!service||!service.booking_enabled) return bad('Service is not available for online booking',404);
  const startAt=textLimit(body.start_at,40); if(!startAt||Number.isNaN(new Date(startAt).getTime())) return bad('Valid start_at is required');
  const duration=Number(service.duration_minutes); const before=Number(service.buffer_before_minutes); const after=Number(service.buffer_after_minutes);
  const visibleStart=new Date(startAt); const reserveStart=new Date(visibleStart.getTime()-before*60_000); const visibleEnd=new Date(visibleStart.getTime()+duration*60_000); const reserveEnd=new Date(visibleEnd.getTime()+after*60_000);
  const id=uid('booking'); const token=crypto.randomUUID(); const now=nowIso();
  const name=textLimit(body.patient_name,120); const phone=cleanPhone(body.patient_phone); if(!name||phone.length<7) return bad('Name and WhatsApp/phone are required');
  const email=textLimit(body.patient_email,180)||null; const language=textLimit(body.preferred_language||'es',5); const note=textLimit(body.patient_note,700)||null;
  const keys=slotKeys(reserveStart.toISOString(),reserveEnd.toISOString());
  const statements=[
    db.prepare(`INSERT INTO bookings(id,public_token,service_id,patient_name,patient_phone,patient_email,preferred_language,start_at,end_at,reserve_start_at,reserve_end_at,status,patient_note,source,approval_requested_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,token,service.id,name,phone,email,language,visibleStart.toISOString(),visibleEnd.toISOString(),reserveStart.toISOString(),reserveEnd.toISOString(),'pending',note,'website',now,now,now),
    ...keys.map(k=>db.prepare(`INSERT INTO booking_locks(slot_key,booking_id,created_at) VALUES(?,?,?)`).bind(k,id,now))
  ];
  try{ await db.batch(statements); }
  catch(e){
    if(String(e).toLowerCase().includes('unique')) return bad('That appointment time has just become unavailable. Please choose another time.',409);
    throw e;
  }
  await audit(db,{actorType:'patient',actorId:phone,action:'booking_requested',entityType:'booking',entityId:id,after:{service_id:service.id,start_at:visibleStart.toISOString(),status:'pending'},requestId:requestId(request),ipHash:await ipHash(request,env)});
  const staff=String(env.STAFF_WHATSAPP_NUMBERS||'').split(',').map(cleanPhone).filter(Boolean);
  if(staff.length){
    const local=utcIsoToLocalParts(visibleStart.toISOString(),Number(await getSetting(db,'utc_offset_minutes',DEFAULT_UTC_OFFSET_MINUTES)));
    const msg=`Nueva solicitud de cita\n${name}\n${service.name_es}\n${local.date} ${local.time}\nID: ${id}\nPendiente de aprobación.`;
    for(const to of staff) try{await sendWhatsAppText(env,to,msg)}catch(e){await recordError(db,'whatsapp.staff_approval',e,{booking_id:id,to})}
  }
  return json({ok:true,booking:{id,public_token:token,status:'pending',start_at:visibleStart.toISOString(),end_at:visibleEnd.toISOString(),service:{id:service.id,name:service.name_es}},message:'Appointment request received and pending staff approval.'},201);
}

async function updateBookingStatus(request,env,id,status){
  const db=dbRequired(env); if(!requireAdmin(request,env)) return bad('Unauthorized',401);
  const booking=await db.prepare(`SELECT b.*,s.name_es AS service_name FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.id=? AND b.deleted_at IS NULL`).bind(id).first();
  if(!booking) return bad('Booking not found',404);
  const now=nowIso(); const actor='admin';
  const release=['declined','cancelled'].includes(status);
  const stmts=[db.prepare(`UPDATE bookings SET status=?, approved_at=CASE WHEN ?='confirmed' THEN ? ELSE approved_at END, approved_by=CASE WHEN ?='confirmed' THEN ? ELSE approved_by END, cancelled_at=CASE WHEN ?='cancelled' THEN ? ELSE cancelled_at END, updated_at=? WHERE id=?`).bind(status,status,now,status,actor,status,now,now,id)];
  if(release) stmts.push(db.prepare(`DELETE FROM booking_locks WHERE booking_id=?`).bind(id));
  await db.batch(stmts);
  await audit(db,{actorType:'staff',actorId:actor,action:`booking_${status}`,entityType:'booking',entityId:id,before:{status:booking.status},after:{status},requestId:requestId(request),ipHash:await ipHash(request,env)});
  if(['confirmed','declined','cancelled'].includes(status)){
    const message=status==='confirmed'?`Su cita con Dra. Ydania ha sido confirmada. ${booking.start_at}`:status==='declined'?`Su solicitud de cita no pudo ser confirmada. El consultorio puede ayudarle a elegir otro horario.`:`Su cita ha sido cancelada.`;
    try{await sendWhatsAppTemplateOrText(env,booking.patient_phone,{templateEnv:status==='confirmed'?'YCLOUD_TEMPLATE_BOOKING_CONFIRMED':status==='cancelled'?'YCLOUD_TEMPLATE_BOOKING_CANCELLED':'YCLOUD_TEMPLATE_BOOKING_DECLINED',text:message,parameters:[booking.patient_name,booking.service_name,booking.start_at]})}catch(e){await recordError(db,'whatsapp.patient_status',e,{booking_id:id,status})}
  }
  if(status==='confirmed') await scheduleReminders(db,id,booking.start_at);
  return json({ok:true,id,status});
}

async function scheduleReminders(db,bookingId,startAt){
  const start=new Date(startAt).getTime(); const now=nowIso();
  const jobs=[['24h',start-DAY_MS],['2h',start-2*60*60_000]].filter(([,t])=>t>Date.now());
  for(const [kind,t] of jobs) await db.prepare(`INSERT OR IGNORE INTO reminder_jobs(id,booking_id,kind,due_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).bind(uid('rem'),bookingId,kind,new Date(t).toISOString(),'pending',now,now).run();
}

async function adminSummary(request,env){
  if(!requireAdmin(request,env)) return bad('Unauthorized',401); const db=dbRequired(env);
  const [pending,today,errors,services,settings]=await Promise.all([
    db.prepare(`SELECT b.id,b.patient_name,b.patient_phone,b.start_at,b.status,s.name_es service_name FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.deleted_at IS NULL AND b.status='pending' ORDER BY b.start_at LIMIT 50`).all(),
    db.prepare(`SELECT b.id,b.patient_name,b.start_at,b.status,s.name_es service_name FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.deleted_at IS NULL AND b.status IN ('pending','confirmed') AND date(b.start_at)=date('now') ORDER BY b.start_at`).all(),
    db.prepare(`SELECT id,component,message,created_at FROM error_log WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 20`).all(),
    db.prepare(`SELECT * FROM services WHERE active=1 ORDER BY name_es`).all(),
    db.prepare(`SELECT key,value FROM settings`).all()
  ]);
  return json({ok:true,pending:pending.results||[],today:today.results||[],errors:errors.results||[],services:services.results||[],settings:Object.fromEntries((settings.results||[]).map(x=>[x.key,x.value]))});
}

async function adminSaveService(request,env,id){
  if(!requireAdmin(request,env)) return bad('Unauthorized',401); const db=dbRequired(env); const body=await request.json();
  const before=await db.prepare(`SELECT * FROM services WHERE id=?`).bind(id).first(); if(!before) return bad('Service not found',404);
  const next={...before,...body}; const now=nowIso();
  await db.prepare(`UPDATE services SET name_es=?,name_en=?,duration_minutes=?,buffer_before_minutes=?,buffer_after_minutes=?,price_text=?,booking_enabled=?,staff_approval_required=?,min_notice_minutes=?,max_per_day=?,instructions=?,updated_at=? WHERE id=?`).bind(textLimit(next.name_es,150),textLimit(next.name_en,150)||null,Number(next.duration_minutes),Number(next.buffer_before_minutes||0),Number(next.buffer_after_minutes||0),textLimit(next.price_text,120)||null,next.booking_enabled?1:0,next.staff_approval_required?1:0,Number(next.min_notice_minutes||0),next.max_per_day?Number(next.max_per_day):null,textLimit(next.instructions,2000)||null,now,id).run();
  await audit(db,{actorType:'staff',actorId:'admin',action:'service_updated',entityType:'service',entityId:id,before,after:next});
  return json({ok:true});
}

async function adminBlock(request,env){
  if(!requireAdmin(request,env)) return bad('Unauthorized',401); const db=dbRequired(env); const body=await request.json();
  if(!body.start_at||!body.end_at) return bad('start_at and end_at required'); const id=uid('block'); const now=nowIso();
  await db.prepare(`INSERT INTO blocked_periods(id,start_at,end_at,reason,source,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).bind(id,body.start_at,body.end_at,textLimit(body.reason,300)||'Unavailable','admin',now,now).run();
  await audit(db,{actorType:'staff',actorId:'admin',action:'blocked_period_created',entityType:'blocked_period',entityId:id,after:body}); return json({ok:true,id},201);
}

async function adminAvailabilityRule(request,env){
  if(!requireAdmin(request,env)) return bad('Unauthorized',401); const db=dbRequired(env); const body=await request.json(); const id=body.id||uid('rule'); const now=nowIso();
  await db.prepare(`INSERT INTO availability_rules(id,weekday,start_time,end_time,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET weekday=excluded.weekday,start_time=excluded.start_time,end_time=excluded.end_time,enabled=excluded.enabled,updated_at=excluded.updated_at`).bind(id,Number(body.weekday),body.start_time,body.end_time,body.enabled===false?0:1,now,now).run();
  await audit(db,{actorType:'staff',actorId:'admin',action:'availability_rule_saved',entityType:'availability_rule',entityId:id,after:body}); return json({ok:true,id});
}

async function adminSaveSettings(request,env){
  if(!requireAdmin(request,env)) return bad('Unauthorized',401); const db=dbRequired(env); const body=await request.json();
  const allowed=['agenda_email_enabled','agenda_email_hour_local','agenda_email_recipients','slot_step_minutes'];
  for(const k of allowed) if(Object.prototype.hasOwnProperty.call(body,k)) await setSetting(db,k,body[k]);
  await audit(db,{actorType:'staff',actorId:'admin',action:'settings_updated',entityType:'settings',after:Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k)))});
  return json({ok:true});
}

async function health(env){
  const components={worker:{ok:true},database:{ok:false},openai:{ok:!!env.OPENAI_API_KEY},whatsapp:{ok:!!env.YCLOUD_API_KEY,provider:whatsappProvider(env)},email:{ok:!!(env.RESEND_API_KEY||env.MAILER)}};
  let unresolvedErrors=null;
  if(env.DB){try{await env.DB.prepare('SELECT 1 AS ok').first(); components.database.ok=true; unresolvedErrors=(await env.DB.prepare(`SELECT count(*) n FROM error_log WHERE resolved_at IS NULL`).first())?.n||0}catch(e){components.database.error=e.message}}
  const ok=components.worker.ok&&components.database.ok;
  return json({ok,status:ok?'healthy':'degraded',components,unresolved_errors:unresolvedErrors,backup:{type:'Cloudflare D1 Time Travel',automatic:true}},ok?200:503);
}

async function interpretSchedulingCommand(env,db,text){
  const services=await listServices(db); const serviceText=services.map(s=>`${s.id}: ${s.name_es} (${s.duration_minutes} min + ${s.buffer_before_minutes}/${s.buffer_after_minutes} buffer)`).join('\n');
  const instructions=`Extract a scheduling command for Dra. Ydania's office. Return JSON only, no markdown. Never invent missing facts. Schema: {"action":"create|block|cancel|move|query|unknown","patient_name":string|null,"service_id":string|null,"date":"YYYY-MM-DD"|null,"time":"HH:MM"|null,"end_time":"HH:MM"|null,"booking_id":string|null,"reason":string|null,"missing":string[]}. Current date UTC: ${new Date().toISOString().slice(0,10)}. Clinic UTC offset is -04:00. Services:\n${serviceText}`;
  const r=await openAiText(env,{instructions,input:text,model:chooseModel(env,{complexity:'simple'})}); return parseJsonText(r.text);
}

async function processStaffCommand(env,db,from,text){
  const cmd=await interpretSchedulingCommand(env,db,text);
  if(cmd.missing?.length) return `No pude completar la instrucción. Falta: ${cmd.missing.join(', ')}.`;
  if(cmd.action==='query') return 'La consulta de agenda por WhatsApp está conectada. Usa el panel para el detalle mientras terminamos los comandos de consulta avanzada.';
  if(cmd.action==='block'){
    const offset=Number(await getSetting(db,'utc_offset_minutes',DEFAULT_UTC_OFFSET_MINUTES)); const start=localDateTimeToUtcIso(cmd.date,cmd.time,offset); const end=localDateTimeToUtcIso(cmd.date,cmd.end_time,offset); const id=uid('block'); const now=nowIso();
    await db.prepare(`INSERT INTO blocked_periods(id,start_at,end_at,reason,source,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).bind(id,start,end,cmd.reason||'Bloqueado por WhatsApp','whatsapp',now,now).run(); await audit(db,{actorType:'staff_whatsapp',actorId:from,action:'blocked_period_created',entityType:'blocked_period',entityId:id,after:cmd}); return `Listo. Bloqueé ${cmd.date} de ${cmd.time} a ${cmd.end_time}.`;
  }
  if(cmd.action==='create'){
    const service=await getService(db,cmd.service_id); if(!service) return 'No reconocí el servicio. Envíame el nombre exacto del procedimiento.';
    const offset=Number(await getSetting(db,'utc_offset_minutes',DEFAULT_UTC_OFFSET_MINUTES)); const start=localDateTimeToUtcIso(cmd.date,cmd.time,offset); const duration=Number(service.duration_minutes), before=Number(service.buffer_before_minutes), after=Number(service.buffer_after_minutes); const reserveStart=new Date(new Date(start).getTime()-before*60_000).toISOString(); const end=new Date(new Date(start).getTime()+duration*60_000).toISOString(); const reserveEnd=new Date(new Date(end).getTime()+after*60_000).toISOString();
    const conflicts=(await db.prepare(`SELECT b.patient_name,b.start_at,b.end_at FROM bookings b WHERE b.deleted_at IS NULL AND b.status IN ('pending','confirmed') AND b.reserve_end_at>? AND b.reserve_start_at<?`).bind(reserveStart,reserveEnd).all()).results||[];
    const blocks=(await db.prepare(`SELECT reason,start_at,end_at FROM blocked_periods WHERE deleted_at IS NULL AND end_at>? AND start_at<?`).bind(reserveStart,reserveEnd).all()).results||[];
    if(conflicts.length||blocks.length) return `Hay un conflicto en ese horario. No agregué la cita. Revisa disponibilidad o indícame otra hora.`;
    const id=uid('booking'),token=crypto.randomUUID(),now=nowIso(); const keys=slotKeys(reserveStart,reserveEnd); const stmts=[db.prepare(`INSERT INTO bookings(id,public_token,service_id,patient_name,patient_phone,preferred_language,start_at,end_at,reserve_start_at,reserve_end_at,status,source,approved_at,approved_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,token,service.id,cmd.patient_name||'Paciente',from,'es',start,end,reserveStart,reserveEnd,'confirmed','staff_whatsapp',now,from,now,now),...keys.map(k=>db.prepare(`INSERT INTO booking_locks(slot_key,booking_id,created_at) VALUES(?,?,?)`).bind(k,id,now))];
    try{await db.batch(stmts)}catch(e){if(String(e).toLowerCase().includes('unique')) return 'Ese horario acaba de ocuparse. No agregué la cita.'; throw e}
    await scheduleReminders(db,id,start); await audit(db,{actorType:'staff_whatsapp',actorId:from,action:'booking_created',entityType:'booking',entityId:id,after:cmd}); return `Listo. Agregué a ${cmd.patient_name} para ${service.name_es} el ${cmd.date} a las ${cmd.time}.`;
  }
  return 'No entendí la instrucción de agenda. Puedes decir, por ejemplo: “Agrega a María para toxina botulínica el 6 de octubre a las 2:30”.';
}

async function staffApprovalCommand(env,db,from,input){
  const m=String(input).trim().match(/^(APROBAR|RECHAZAR|CANCELAR)\s+(booking_[a-z0-9-]+)$/i);
  if(!m) return null;
  const action=m[1].toUpperCase(),id=m[2];
  const booking=await db.prepare(`SELECT b.*,s.name_es service_name FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.id=? AND b.deleted_at IS NULL`).bind(id).first();
  if(!booking) return `No encontré la cita ${id}.`;
  const status=action==='APROBAR'?'confirmed':action==='RECHAZAR'?'declined':'cancelled'; const now=nowIso();
  const stmts=[db.prepare(`UPDATE bookings SET status=?,approved_at=CASE WHEN ?='confirmed' THEN ? ELSE approved_at END,approved_by=CASE WHEN ?='confirmed' THEN ? ELSE approved_by END,cancelled_at=CASE WHEN ?='cancelled' THEN ? ELSE cancelled_at END,updated_at=? WHERE id=?`).bind(status,status,now,status,from,status,now,now,id)];
  if(status!=='confirmed') stmts.push(db.prepare(`DELETE FROM booking_locks WHERE booking_id=?`).bind(id));
  await db.batch(stmts); if(status==='confirmed') await scheduleReminders(db,id,booking.start_at);
  await audit(db,{actorType:'staff_whatsapp',actorId:from,action:`booking_${status}`,entityType:'booking',entityId:id,before:{status:booking.status},after:{status}});
  const patientText=status==='confirmed'?`Su cita con Dra. Ydania ha sido confirmada. ${booking.service_name} — ${booking.start_at}`:status==='declined'?'Su solicitud no pudo ser confirmada. El consultorio puede ayudarle a elegir otro horario.':'Su cita ha sido cancelada.';
  try{await sendWhatsAppTemplateOrText(env,booking.patient_phone,{templateEnv:status==='confirmed'?'YCLOUD_TEMPLATE_BOOKING_CONFIRMED':status==='cancelled'?'YCLOUD_TEMPLATE_BOOKING_CANCELLED':'YCLOUD_TEMPLATE_BOOKING_DECLINED',text:patientText,parameters:[booking.patient_name,booking.service_name,booking.start_at]})}catch(e){await recordError(db,'whatsapp.patient_status',e,{booking_id:id,status})}
  return status==='confirmed'?`Aprobada: ${booking.patient_name} — ${booking.service_name}.`:status==='declined'?`Solicitud rechazada: ${booking.patient_name}.`:`Cita cancelada: ${booking.patient_name}.`;
}

async function ycloudWebhook(request,env){
  const db=dbRequired(env); const event=await request.json(); if(!event?.id) return bad('Invalid webhook');
  const duplicate=await db.prepare(`SELECT 1 FROM message_log WHERE external_id=? LIMIT 1`).bind(event.id).first(); if(duplicate) return json({ok:true,duplicate:true});
  if(event.type==='whatsapp.inbound_message.received'){
    const m=event.whatsappInboundMessage||{}; const from=cleanPhone(m.from); const staff=String(env.STAFF_WHATSAPP_NUMBERS||'').split(',').map(cleanPhone).filter(Boolean); const authorized=staff.includes(from); let input='';
    if(m.type==='text') input=m.text?.body||'';
    else if(m.type==='audio'&&authorized){const media=await downloadYCloudMedia(env,m.audio.link); input=await transcribeAudio(env,media.buffer,m.audio.mime_type||media.mimeType);}
    await db.prepare(`INSERT INTO message_log(id,provider,direction,channel,external_id,recipient,message_type,status,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(uid('msg'),'ycloud','inbound','whatsapp',event.id,from,m.type,'received',JSON.stringify({fromUserId:m.fromUserId||null,transcript:input||null}),nowIso(),nowIso()).run();
    if(authorized&&input){
      try{const direct=await staffApprovalCommand(env,db,from,input); const reply=direct||await processStaffCommand(env,db,from,input); await sendWhatsAppText(env,from,reply)}catch(e){await recordError(db,'whatsapp.staff_command',e,{event_id:event.id,from}); try{await sendWhatsAppText(env,from,'Ocurrió un error y no hice ningún cambio en la agenda. Revisa el panel o intenta de nuevo.')}catch{}}
    }
  } else if(event.type==='whatsapp.message.updated'){
    const m=event.whatsappMessage||{}; await db.prepare(`INSERT INTO message_log(id,provider,direction,channel,external_id,recipient,message_type,status,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(uid('msg'),'ycloud','outbound','whatsapp',event.id,m.to||null,m.type||null,m.status||null,JSON.stringify({message_id:m.id||null,pricingType:m.pricingType||null,totalPrice:m.totalPrice||null,currency:m.currency||null}),nowIso(),nowIso()).run();
  }
  return json({ok:true});
}

async function runReminderJobs(env,db){
  const jobs=(await db.prepare(`SELECT r.*,b.patient_phone,b.patient_name,b.start_at,s.name_es service_name FROM reminder_jobs r JOIN bookings b ON b.id=r.booking_id JOIN services s ON s.id=b.service_id WHERE r.status='pending' AND r.due_at<=? AND b.status='confirmed' ORDER BY r.due_at LIMIT 25`).bind(nowIso()).all()).results||[];
  for(const j of jobs){
    await db.prepare(`UPDATE reminder_jobs SET status='processing',attempts=attempts+1,updated_at=? WHERE id=?`).bind(nowIso(),j.id).run();
    try{const msg=j.kind==='24h'?`Recordatorio: tiene una cita con Dra. Ydania mañana. ${j.service_name} — ${j.start_at}`:`Recordatorio: su cita con Dra. Ydania es en aproximadamente 2 horas. ${j.service_name}.`; await sendWhatsAppTemplateOrText(env,j.patient_phone,{templateEnv:j.kind==='24h'?'YCLOUD_TEMPLATE_REMINDER_24H':'YCLOUD_TEMPLATE_REMINDER_2H',text:msg,parameters:[j.patient_name,j.service_name,j.start_at]}); await db.prepare(`UPDATE reminder_jobs SET status='sent',sent_at=?,updated_at=? WHERE id=?`).bind(nowIso(),nowIso(),j.id).run();}
    catch(e){await db.prepare(`UPDATE reminder_jobs SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'pending' END,last_error=?,updated_at=? WHERE id=?`).bind(String(e.message||e).slice(0,500),nowIso(),j.id).run(); await recordError(db,'reminder',e,{job_id:j.id,booking_id:j.booking_id})}
  }
}

async function expirePending(db){
  const cutoff=new Date(Date.now()-24*60*60_000).toISOString(); const rows=(await db.prepare(`SELECT id FROM bookings WHERE status='pending' AND created_at<? AND deleted_at IS NULL LIMIT 100`).bind(cutoff).all()).results||[];
  for(const b of rows) await db.batch([db.prepare(`UPDATE bookings SET status='declined',staff_note=COALESCE(staff_note,'') || ' [Auto-expired pending request]',updated_at=? WHERE id=?`).bind(nowIso(),b.id),db.prepare(`DELETE FROM booking_locks WHERE booking_id=?`).bind(b.id)]);
}

async function maybeSendAgenda(env,db){
  const offset=Number(await getSetting(db,'utc_offset_minutes',DEFAULT_UTC_OFFSET_MINUTES)); const local=utcIsoToLocalParts(nowIso(),offset); const hour=Number(local.time.slice(0,2)); const enabled=await getSetting(db,'agenda_email_enabled','1'); const targetHour=Number(await getSetting(db,'agenda_email_hour_local','19')); if(enabled!=='1'||hour!==targetHour) return;
  const sentKey=`agenda_last_sent_${local.date}`; if(await getSetting(db,sentKey,null)) return;
  const tomorrow=new Date(new Date(`${local.date}T00:00:00Z`).getTime()+DAY_MS).toISOString().slice(0,10); const start=localDateTimeToUtcIso(tomorrow,'00:00',offset),end=new Date(new Date(start).getTime()+DAY_MS).toISOString();
  const rows=(await db.prepare(`SELECT b.patient_name,b.start_at,b.status,s.name_es service_name FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.deleted_at IS NULL AND b.status IN ('pending','confirmed') AND b.start_at>=? AND b.start_at<? ORDER BY b.start_at`).bind(start,end).all()).results||[];
  const lines=rows.length?rows.map(r=>{const t=utcIsoToLocalParts(r.start_at,offset).time;return `${t} — ${r.patient_name} — ${r.service_name}${r.status==='pending'?' (pendiente)':''}`}).join('\n'):'No hay citas programadas.';
  const recipients=String(await getSetting(db,'agenda_email_recipients','Info@DraYdania.com')).split(',').map(x=>x.trim()).filter(Boolean); await sendEmail(env,{to:recipients,subject:`Agenda Dra. Ydania — ${tomorrow}`,text:`Agenda para ${tomorrow}\n\n${lines}`}); await setSetting(db,sentKey,nowIso());
}

async function emailCommand(message,env){
  if(!env.DB) return; const db=env.DB; const parser=new PostalMime(); const parsed=await parser.parse(message.raw); const sender=cleanPhone(''); const text=[parsed.subject,parsed.text].filter(Boolean).join('\n').trim(); if(!text) return;
  const allowed=String(env.SCHEDULING_EMAIL_SENDERS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean); const from=(parsed.from?.address||'').toLowerCase(); if(allowed.length&&!allowed.includes(from)){await recordError(db,'email_command',new Error('Unauthorized sender'),{from}); return;}
  try{const reply=await processStaffCommand(env,db,`email:${from}`,text); if(env.SCHEDULING_EMAIL_REPLY_TO||from) await sendEmail(env,{to:env.SCHEDULING_EMAIL_REPLY_TO||from,subject:`Re: ${parsed.subject||'Agenda'}`,text:reply});}
  catch(e){await recordError(db,'email_command',e,{from,subject:parsed.subject});}
}

async function route(request,env){
  const url=new URL(request.url); const path=url.pathname; const cors=corsHeaders(request);
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  try{
    let response;
    if(path==='/api/health'&&request.method==='GET') response=await health(env);
    else if(path==='/api/services'&&request.method==='GET'){const db=dbRequired(env); response=json({ok:true,services:await listServices(db)});}
    else if(path==='/api/availability'&&request.method==='GET'){const db=dbRequired(env); const service=await getService(db,url.searchParams.get('service')||''); const date=url.searchParams.get('date'); response=!service?bad('Service not found',404):!/^\d{4}-\d{2}-\d{2}$/.test(date||'')?bad('Valid date required'):json({ok:true,slots:await availabilityFor(db,service,date),service:{id:service.id,name:service.name_es,duration_minutes:service.duration_minutes}});}
    else if(path==='/api/bookings/request'&&request.method==='POST') response=await createBookingRequest(request,env);
    else if(path==='/api/chat'&&request.method==='POST') response=await handleChat(request,env);
    else if(path==='/api/admin/summary'&&request.method==='GET') response=await adminSummary(request,env);
    else if(path.startsWith('/api/admin/services/')&&request.method==='PATCH') response=await adminSaveService(request,env,path.split('/').pop());
    else if(path==='/api/admin/blocks'&&request.method==='POST') response=await adminBlock(request,env);
    else if(path==='/api/admin/availability-rules'&&request.method==='POST') response=await adminAvailabilityRule(request,env);
    else if(path==='/api/admin/settings'&&request.method==='PATCH') response=await adminSaveSettings(request,env);
    else if(/^\/api\/admin\/bookings\/[^/]+\/(approve|decline|cancel)$/.test(path)&&request.method==='POST'){const parts=path.split('/'); const action=parts.pop(),id=parts.pop(); response=await updateBookingStatus(request,env,id,action==='approve'?'confirmed':action==='decline'?'declined':'cancelled');}
    else if(path==='/api/webhooks/ycloud'&&request.method==='POST') response=await ycloudWebhook(request,env);
    else return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
    for(const [k,v] of Object.entries(cors)) response.headers.set(k,v); return response;
  }catch(e){if(env.DB) await recordError(env.DB,'http',e,{path,method:request.method,request_id:requestId(request)}); const r=bad('Service temporarily unavailable',503,{request_id:requestId(request)}); for(const [k,v] of Object.entries(cors)) r.headers.set(k,v); return r;}
}

export default {
  fetch: route,
  async scheduled(controller,env,ctx){if(!env.DB)return; ctx.waitUntil((async()=>{try{await expirePending(env.DB);await runReminderJobs(env,env.DB);await maybeSendAgenda(env,env.DB)}catch(e){await recordError(env.DB,'scheduled',e,{cron:controller.cron})}})())},
  async email(message,env,ctx){ctx.waitUntil(emailCommand(message,env))}
};