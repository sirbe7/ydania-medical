const YCLOUD_BASE='https://api.ycloud.com/v2';

export function whatsappProvider(env){ return (env.WHATSAPP_PROVIDER||'ycloud').toLowerCase(); }

async function ycloudRequest(env,path,options={}){
  if(!env.YCLOUD_API_KEY) throw new Error('YCLOUD_API_KEY is not configured');
  const res=await fetch(`${YCLOUD_BASE}${path}`,{...options,headers:{'Content-Type':'application/json','X-API-Key':env.YCLOUD_API_KEY,...(options.headers||{})}});
  if(!res.ok) throw new Error(`YCloud ${res.status}: ${(await res.text()).slice(0,500)}`);
  return res.status===204?{}:res.json();
}

export async function sendWhatsAppText(env,to,text){
  const provider=whatsappProvider(env);
  if(provider==='ycloud'){
    return ycloudRequest(env,'/whatsapp/messages/sendDirectly',{method:'POST',body:JSON.stringify({from:env.WHATSAPP_FROM,to,type:'text',text:{body:text}})});
  }
  if(provider==='twilio') throw new Error('Twilio adapter is not configured yet; switch is intentionally isolated here.');
  throw new Error(`Unsupported WhatsApp provider: ${provider}`);
}

export async function sendWhatsAppTemplate(env,to,name,parameters=[],language='es_VE'){
  const provider=whatsappProvider(env);
  if(provider==='ycloud'){
    return ycloudRequest(env,'/whatsapp/messages/sendDirectly',{method:'POST',body:JSON.stringify({from:env.WHATSAPP_FROM,to,type:'template',template:{name,language:{code:language,policy:'deterministic'},components:parameters.length?[{type:'body',parameters:parameters.map(text=>({type:'text',text:String(text)}))}]:[]}})});
  }
  if(provider==='twilio') throw new Error('Twilio template adapter not configured yet.');
  throw new Error(`Unsupported WhatsApp provider: ${provider}`);
}

export async function sendWhatsAppTemplateOrText(env,to,{templateEnv,text,parameters=[]}){
  const templateName=env[templateEnv];
  if(templateName) return sendWhatsAppTemplate(env,to,templateName,parameters);
  return sendWhatsAppText(env,to,text);
}

export async function downloadYCloudMedia(env,link){
  if(!env.YCLOUD_API_KEY) throw new Error('YCLOUD_API_KEY is not configured');
  const res=await fetch(link,{headers:{'X-API-Key':env.YCLOUD_API_KEY}});
  if(!res.ok) throw new Error(`YCloud media ${res.status}`);
  return {buffer:await res.arrayBuffer(),mimeType:res.headers.get('content-type')||'application/octet-stream'};
}