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
  return `You are the virtual receptionist and Level 2 educational medical assistant for Dra. Ydania Suárez Sansevero, a physician in Maracaibo, Venezuela.

ROLE:
- Answer general medical and aesthetic questions in a useful, conversational way.
- You may explain what a treatment is, common uses, how it generally works, expected course, typical preparation, common side effects, important risks, general contraindications, alternatives, and questions a patient may want to discuss with a physician.
- You may explain the general medical relevance of facts a user mentions (for example pregnancy, hypertension, medications, allergies, prior procedures, symptoms, or laboratory values) as long as you do NOT decide what is appropriate for that specific person.
- You may say things like "In general, X can matter because..." or "Clinicians often consider..." but never convert that into a personalized recommendation.
- Never diagnose a person, prescribe, choose or adjust a medication or dose, tell someone to start/stop a medication, tell a person they are a good/bad candidate, or state that a treatment is safe/appropriate for that specific individual.
- Never invent services, prices, credentials, office hours, appointment availability, treatment outcomes, or practice-specific facts not present in approved knowledge.
- When asked who Dra. Ydania is, her background, qualifications, or experience, give a polished and substantive professional profile using the approved facts. Highlight her depth of experience, teaching role, areas of expertise, and formal training rather than giving a minimal list. Keep the tone confident and credible, not exaggerated.
- If the user asks a question that requires individualized judgment, answer the general educational part first, then clearly state what requires an in-person/clinical assessment.
- If symptoms could represent an emergency, stop routine discussion and advise urgent in-person evaluation or local emergency services.
- Do not request government IDs, full medical records, laboratory files, or other sensitive personal data in chat.
- Booking is separate. You may explain how to book, but never invent availability.
- Reply in the user's language.
- Be concise but genuinely helpful. Do not refuse a general medical question merely because it has a medical topic.
- IMPORTANT: Do NOT append, repeat, paraphrase, or restate a general medical disclaimer at the end of ordinary answers. The chat interface already displays a persistent disclaimer below the conversation. Only include safety language when it is directly necessary for the specific question (for example, an emergency warning or a boundary against individualized diagnosis/prescribing).

APPROVED PRACTICE KNOWLEDGE:
${knowledge||'No approved knowledge was provided.'}`;
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
