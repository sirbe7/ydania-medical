const OPENAI_URL='https://api.openai.com/v1/responses';

export function chooseModel(env,{risk='normal',complexity='simple'}={}){
  if(risk==='medical_sensitive' || complexity==='complex') return env.OPENAI_MODEL_SMART || 'gpt-6-sol';
  return env.OPENAI_MODEL_FAST || 'gpt-6-luna';
}

export function medicalRisk(text=''){
  const t=text.toLowerCase();
  const urgent=/chest pain|difficulty breathing|can't breathe|unconscious|severe bleeding|stroke|suicid|dolor de pecho|dificultad para respirar|no puedo respirar|desmayo|sangrado severo|derrame|suicid/.test(t);
  const individualized=/i am pregnant|i'm pregnant|my medication|my diagnosis|my lab|should i take|what dose|how many units|estoy embaraz|mi medicamento|mi diagnóstico|mis análisis|qué dosis|cuántas unidades|debo tomar/.test(t);
  return urgent?'urgent':individualized?'medical_sensitive':'normal';
}

export function sanitizePublicChatInput(text=''){
  return String(text).replace(/\b\d{6,}\b/g,'[number removed]').slice(0,3000);
}

export async function openAiText(env,{instructions,input,model,risk='normal'}){
  if(!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const body={model:model||chooseModel(env,{risk}),instructions,input,max_output_tokens:500};
  const res=await fetch(OPENAI_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.OPENAI_API_KEY}`},body:JSON.stringify(body)});
  if(!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0,500)}`);
  const data=await res.json();
  const text=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();
  if(!text) throw new Error('OpenAI returned no text');
  return {text,model:data.model||body.model,responseId:data.id};
}

export async function transcribeAudio(env,arrayBuffer,mimeType='audio/ogg'){
  if(!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const form=new FormData();
  const ext=mimeType.includes('ogg')?'ogg':mimeType.includes('mpeg')?'mp3':'audio';
  form.append('file',new Blob([arrayBuffer],{type:mimeType}),`voice.${ext}`);
  form.append('model',env.OPENAI_TRANSCRIBE_MODEL||'gpt-transcribe');
  form.append('language','es');
  const res=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`},body:form});
  if(!res.ok) throw new Error(`Transcription ${res.status}: ${(await res.text()).slice(0,500)}`);
  const data=await res.json();
  return data.text||'';
}

export function chatbotInstructions({knowledge='',disclaimer=''}){
  return `You are the virtual receptionist and educational assistant for Dra. Ydania Suárez Sansevero, a physician in Maracaibo, Venezuela.\n\nROLE:\n- Give clear general educational information about the practice, its listed services, logistics, preparation basics, and general treatment concepts.\n- You may explain common uses, general risks, typical considerations, and general contraindication categories.\n- Never diagnose, prescribe, choose a dose, tell a person to start/stop medication, state that a treatment is appropriate for a specific individual, or make individualized treatment recommendations.\n- If a user gives individualized medical facts, acknowledge them without analyzing them and say a physician must evaluate their specific situation.\n- If symptoms might be urgent, stop normal discussion and advise urgent in-person medical evaluation/emergency services appropriate to their location.\n- Do not request medical history, government IDs, laboratory reports, or other sensitive information.\n- Booking is separate. You may direct the user to the booking system or WhatsApp, but do not invent availability.\n- Do not invent services, prices, credentials, hours, or clinical facts that are not in approved knowledge.\n- Reply in the user's language. Be concise and professional.\n\nAPPROVED PRACTICE KNOWLEDGE:\n${knowledge||'No approved knowledge was provided.'}\n\nDISCLAIMER TO PRESERVE IN MEANING:\n${disclaimer}`;
}

export function aiProvider(env){ return (env.AI_PROVIDER||'openai').toLowerCase(); }

async function anthropicText(env,{instructions,input,model}){
  if(!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured');
  const selected=model||env.ANTHROPIC_MODEL_FAST||'claude-haiku-4-5-20251001';
  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:selected,max_tokens:500,system:instructions,messages:[{role:'user',content:input}]})
  });
  if(!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0,500)}`);
  const data=await res.json();
  const text=(data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n').trim();
  if(!text) throw new Error('Anthropic returned no text');
  return {text,model:data.model||selected,responseId:data.id};
}

export async function generateText(env,args){
  const provider=aiProvider(env);
  if(provider==='openai') return openAiText(env,args);
  if(provider==='anthropic') return anthropicText(env,args);
  throw new Error(`Unsupported AI provider: ${provider}`);
}
