document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

const scrollTopButton=document.querySelector('.scroll-top');
if(scrollTopButton){
  const updateScrollTop=()=>scrollTopButton.classList.toggle('visible',window.scrollY>320);
  updateScrollTop();
  window.addEventListener('scroll',updateScrollTop,{passive:true});
  scrollTopButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}


const heroCarousel=document.querySelector('[data-hero-carousel]');
if(heroCarousel){
  const firstSlide=heroCarousel.querySelector('img');
  const slides=Array.from({length:16},(_,i)=>`/assets/images/carousel/hero-${String(i+1).padStart(2,'0')}.jpg`);
  let index=0;
  let active=firstSlide;
  active.classList.add('hero-carousel-slide','is-active');

  const standby=document.createElement('img');
  standby.className='hero-carousel-slide';
  standby.alt='';
  standby.setAttribute('aria-hidden','true');
  heroCarousel.appendChild(standby);
  let inactive=standby;

  slides.slice(1).forEach(src=>{const img=new Image();img.src=src;});

  const showSlide=(nextIndex)=>{
    const nextSrc=slides[nextIndex];
    const preloader=new Image();
    preloader.src=nextSrc;
    const swap=()=>{
      inactive.src=nextSrc;
      inactive.onload=()=>{
        inactive.classList.add('is-active');
        active.classList.remove('is-active');
        const previous=active;
        active=inactive;
        inactive=previous;
        index=nextIndex;
      };
      if(inactive.complete) inactive.onload();
    };
    if(preloader.complete) swap(); else preloader.onload=swap;
  };

  let timer=setInterval(()=>showSlide((index+1)%slides.length),3000);
  const resetTimer=()=>{
    clearInterval(timer);
    timer=setInterval(()=>showSlide((index+1)%slides.length),3000);
  };

  let touchStartX=null;
  heroCarousel.addEventListener('touchstart',e=>{touchStartX=e.touches[0]?.clientX??null;},{passive:true});
  heroCarousel.addEventListener('touchend',e=>{
    if(touchStartX===null)return;
    const endX=e.changedTouches[0]?.clientX??touchStartX;
    const delta=endX-touchStartX;
    if(Math.abs(delta)>45){
      showSlide(delta<0?(index+1)%slides.length:(index-1+slides.length)%slides.length);
      resetTimer();
    }
    touchStartX=null;
  },{passive:true});
}


const chatbotCopy={
  es:{title:'Asistente virtual',welcome:'Hola. Puedo ayudarte con información general sobre servicios, ubicación y cómo solicitar una consulta.',placeholder:'Escribe tu pregunta…',send:'Enviar',privacy:'No compartas información médica sensible aquí. Para atención personalizada, usa WhatsApp.',fallback:'Puedo orientarte sobre servicios, ubicación o cómo solicitar una consulta. Para una pregunta clínica o personal, comunícate por WhatsApp.',appointment:'Para solicitar una consulta, puedes usar el botón de WhatsApp del sitio y escribir directamente al consultorio.',services:'La Dra. Ydania ofrece atención en medicina estética, control de peso y metabolismo, armonización facial, radiofrecuencia, PRP y composición corporal. La indicación depende de una valoración médica.',location:'El consultorio está en Av. 3G, Edif. Mini Center Veras Altas, Planta Baja, Local Nº 66-149, sector Las Mercedes, Maracaibo, Zulia.',whatsapp:'Abrir WhatsApp'},
  en:{title:'Virtual assistant',welcome:'Hi. I can help with general information about services, location, and how to request a consultation.',placeholder:'Type your question…',send:'Send',privacy:'Do not share sensitive medical information here. For personalized care, use WhatsApp.',fallback:'I can help with services, location, or how to request a consultation. For clinical or personal questions, please contact the office on WhatsApp.',appointment:'To request a consultation, use the WhatsApp button on this site to contact the office directly.',services:'Dr. Ydania provides medical aesthetics, weight and metabolism care, facial harmonization, radiofrequency, PRP, and body composition services. Treatment depends on a medical evaluation.',location:'The office is at Av. 3G, Edif. Mini Center Veras Altas, Ground Floor, Local Nº 66-149, Las Mercedes, Maracaibo, Zulia.',whatsapp:'Open WhatsApp'},
  pt:{title:'Assistente virtual',welcome:'Olá. Posso ajudar com informações gerais sobre serviços, localização e como solicitar uma consulta.',placeholder:'Digite sua pergunta…',send:'Enviar',privacy:'Não compartilhe informações médicas sensíveis aqui. Para atendimento personalizado, use o WhatsApp.',fallback:'Posso orientar sobre serviços, localização ou como solicitar uma consulta. Para dúvidas clínicas ou pessoais, fale com o consultório pelo WhatsApp.',appointment:'Para solicitar uma consulta, use o botão do WhatsApp deste site para falar diretamente com o consultório.',services:'A Dra. Ydania oferece medicina estética, controle de peso e metabolismo, harmonização facial, radiofrequência, PRP e composição corporal. A indicação depende de avaliação médica.',location:'O consultório fica na Av. 3G, Edif. Mini Center Veras Altas, térreo, Local Nº 66-149, Las Mercedes, Maracaibo, Zulia.',whatsapp:'Abrir WhatsApp'},
  it:{title:'Assistente virtuale',welcome:'Ciao. Posso aiutarti con informazioni generali su servizi, posizione e come richiedere una consulenza.',placeholder:'Scrivi la tua domanda…',send:'Invia',privacy:'Non condividere informazioni mediche sensibili qui. Per assistenza personalizzata, usa WhatsApp.',fallback:'Posso aiutarti con servizi, posizione o come richiedere una consulenza. Per domande cliniche o personali, contatta lo studio su WhatsApp.',appointment:'Per richiedere una consulenza, usa il pulsante WhatsApp del sito per contattare direttamente lo studio.',services:'La Dott.ssa Ydania offre medicina estetica, controllo del peso e metabolismo, armonizzazione facciale, radiofrequenza, PRP e composizione corporea. Il trattamento dipende da una valutazione medica.',location:'Lo studio si trova in Av. 3G, Edif. Mini Center Veras Altas, piano terra, Local Nº 66-149, Las Mercedes, Maracaibo, Zulia.',whatsapp:'Apri WhatsApp'},
  ko:{title:'가상 안내 도우미',welcome:'안녕하세요. 진료 분야, 위치, 상담 요청 방법에 대한 일반 정보를 안내해 드릴 수 있습니다.',placeholder:'질문을 입력하세요…',send:'보내기',privacy:'민감한 의료 정보는 여기에 입력하지 마세요. 개인 상담은 WhatsApp을 이용해 주세요.',fallback:'진료 분야, 위치, 상담 요청 방법을 안내할 수 있습니다. 개인적이거나 임상적인 질문은 WhatsApp으로 문의해 주세요.',appointment:'상담을 요청하려면 사이트의 WhatsApp 버튼을 이용해 진료실로 직접 문의하세요.',services:'Ydania 의사는 미용의학, 체중 및 대사 관리, 안면 조화, 고주파, PRP, 체성분 관리를 제공합니다. 치료 여부는 의학적 평가 후 결정됩니다.',location:'진료실: Av. 3G, Edif. Mini Center Veras Altas, Ground Floor, Local Nº 66-149, Las Mercedes, Maracaibo, Zulia.',whatsapp:'WhatsApp 열기'}
};
const lang=(document.documentElement.lang||'es').slice(0,2);
const chatText=chatbotCopy[lang]||chatbotCopy.es;
const floating=document.querySelector('.floating-controls');
if(floating){
  const toggle=document.createElement('button');
  toggle.className='ai-chat-toggle';
  toggle.type='button';
  toggle.setAttribute('aria-label',chatText.title);
  toggle.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 7.5h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H14l-6.5 4v-4H7a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 14h12M10 18h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="ai-badge">AI</span>';
  floating.appendChild(toggle);

  const panel=document.createElement('section');
  panel.className='ai-chat-panel';
  panel.setAttribute('aria-hidden','true');
  panel.innerHTML=`
    <div class="ai-chat-head"><strong>${chatText.title}</strong><button class="ai-chat-close" type="button" aria-label="Close">×</button></div>
    <div class="ai-chat-messages"><div class="ai-msg ai-msg-bot">${chatText.welcome}</div></div>
    <div class="ai-chat-quick">
      <button type="button" data-chat-topic="appointment">Consulta</button>
      <button type="button" data-chat-topic="services">Servicios</button>
      <button type="button" data-chat-topic="location">Ubicación</button>
    </div>
    <form class="ai-chat-form"><input type="text" autocomplete="off" placeholder="${chatText.placeholder}" aria-label="${chatText.placeholder}"><button type="submit">${chatText.send}</button></form>
    <div class="ai-chat-privacy">${chatText.privacy}</div>
  `;
  document.body.appendChild(panel);

  const messages=panel.querySelector('.ai-chat-messages');
  const input=panel.querySelector('input');
  const addMsg=(text,who='bot')=>{
    const el=document.createElement('div');
    el.className='ai-msg '+(who==='user'?'ai-msg-user':'ai-msg-bot');
    el.textContent=text;
    messages.appendChild(el);
    messages.scrollTop=messages.scrollHeight;
  };
  const answer=(raw)=>{
    const q=raw.toLowerCase();
    if(/cita|consulta|appointment|book|agendar|marcar|prenot|상담/.test(q)) return chatText.appointment;
    if(/servic|trat|botox|peso|obes|metabol|prp|radio|armon|service|tratt|serviço|진료/.test(q)) return chatText.services;
    if(/ubic|direc|address|where|local|indirizzo|endereço|위치/.test(q)) return chatText.location;
    return chatText.fallback;
  };
  const setOpen=(open)=>{
    panel.classList.toggle('open',open);
    panel.setAttribute('aria-hidden',open?'false':'true');
    if(open) setTimeout(()=>input.focus(),50);
  };
  toggle.addEventListener('click',()=>setOpen(!panel.classList.contains('open')));
  panel.querySelector('.ai-chat-close').addEventListener('click',()=>setOpen(false));
  panel.querySelectorAll('[data-chat-topic]').forEach(btn=>btn.addEventListener('click',()=>{
    const topic=btn.dataset.chatTopic;
    addMsg(btn.textContent,'user');
    addMsg(chatText[topic]||chatText.fallback);
  }));
  panel.querySelector('.ai-chat-form').addEventListener('submit',e=>{
    e.preventDefault();
    const value=input.value.trim();
    if(!value)return;
    addMsg(value,'user');
    input.value='';
    window.setTimeout(()=>addMsg(answer(value)),180);
  });
}
