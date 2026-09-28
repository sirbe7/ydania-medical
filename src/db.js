export const nowIso = () => new Date().toISOString();
export const uid = (prefix='id') => `${prefix}_${crypto.randomUUID()}`;

export async function getSetting(db,key,fallback=null){
  if(!db) return fallback;
  const row=await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();
  return row?.value ?? fallback;
}

export async function setSetting(db,key,value){
  const now=nowIso();
  await db.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).bind(key,String(value),now).run();
}

export async function audit(db,{actorType='system',actorId=null,action,entityType,entityId=null,before=null,after=null,requestId=null,ipHash=null}){
  if(!db) return;
  await db.prepare(`INSERT INTO audit_log(id,actor_type,actor_id,action,entity_type,entity_id,before_json,after_json,request_id,ip_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(uid('audit'),actorType,actorId,action,entityType,entityId,before?JSON.stringify(before):null,after?JSON.stringify(after):null,requestId,ipHash,nowIso()).run();
}

export async function recordError(db,component,error,context={}){
  const message=error instanceof Error?error.message:String(error);
  if(!db){ console.error(component,message,context); return; }
  try{
    await db.prepare(`INSERT INTO error_log(id,severity,component,message,context_json,created_at) VALUES(?,?,?,?,?,?)`)
      .bind(uid('err'),'error',component,message,JSON.stringify(context),nowIso()).run();
  }catch(e){ console.error('recordError failed',e,message); }
}

export async function listServices(db){
  const r=await db.prepare(`SELECT * FROM services WHERE active=1 ORDER BY category,name_es`).all();
  return r.results||[];
}

export async function getService(db,idOrSlug){
  return db.prepare(`SELECT * FROM services WHERE active=1 AND (id=? OR slug=?)`).bind(idOrSlug,idOrSlug).first();
}