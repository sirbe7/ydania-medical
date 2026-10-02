document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

const languageOptions=[
  {code:'es',short:'ES',label:'Español',href:'/'},
  {code:'en',short:'EN',label:'English',href:'/en/'},
  {code:'pt',short:'PT',label:'Português',href:'/pt/'},
  {code:'it',short:'IT',label:'Italiano',href:'/it/'},
  {code:'ko',short:'KO',label:'한국어',href:'/ko/'}
];
const pageLang=(document.documentElement.lang||'es').slice(0,2);
const currentLanguage=languageOptions.find(x=>x.code===pageLang)||languageOptions[0];

const oldLangLink=document.querySelector('.links .lang');
if(oldLangLink){
  const selector=document.createElement('div');
  selector.className='language-selector';
  selector.innerHTML=`
    <button class="language-trigger" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Language">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.4 2.4 3.7 5.4 3.7 9S14.4 18.6 12 21M12 3C9.6 5.4 8.3 8.4 8.3 12S9.6 18.6 12 21" fill="none" stroke="currentColor" stroke-width="1.35"/></svg>
      <span>${currentLanguage.short}</span>
      <svg class="language-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="language-dropdown" role="menu">
      ${languageOptions.map(x=>`<a role="menuitem" href="${x.href}" class="${x.code===currentLanguage.code?'is-current':''}"><span>${x.label}</span>${x.code===currentLanguage.code?'<span class="language-check">✓</span>':''}</a>`).join('')}
    </div>
  `;
  oldLangLink.replaceWith(selector);
  const trigger=selector.querySelector('.language-trigger');
  const dropdown=selector.querySelector('.language-dropdown');
  const setLanguageMenu=open=>{
    selector.classList.toggle('open',open);
    trigger.setAttribute('aria-expanded',open?'true':'false');
  };
  trigger.addEventListener('click',e=>{e.stopPropagation();setLanguageMenu(!selector.classList.contains('open'));});
  document.addEventListener('click',e=>{if(!selector.contains(e.target))setLanguageMenu(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setLanguageMenu(false);});
}

const footerLangMenu=document.querySelector('#idiomas .language-menu');
if(footerLangMenu){
  footerLangMenu.innerHTML=languageOptions.map((x,i)=>`<a href="${x.href}" class="${x.code===currentLanguage.code?'active-lang':''}">${x.label}</a>${i<languageOptions.length-1?'<span class="language-separator" aria-hidden="true">·</span>':''}`).join('');
  const eyebrow=footerLangMenu.closest('#idiomas')?.querySelector('.eyebrow');
  if(eyebrow) eyebrow.remove();
}


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
  es:{title:'Alma',subtitle:'Asistente virtual de Dra. Ydania',welcome:'Hola. Puedo ayudarte con información general sobre servicios, ubicación y cómo solicitar una consulta.',placeholder:'Escribe tu pregunta…',send:'Enviar',privacy:'No compartas información médica sensible aquí. Para atención personalizada, usa WhatsApp.',fallback:'Puedo orientarte sobre servicios, ubicación o cómo solicitar una consulta. Para una pregunta clínica o personal, comunícate por WhatsApp.',appointment:'Para solicitar una consulta, puedes usar el botón de WhatsApp del sitio y escribir directamente al consultorio.',services:'La Dra. Ydania ofrece atención en medicina estética, control de peso y metabolismo, armonización facial, radiofrecuencia, PRP y composición corporal. La indicación depende de una valoración médica.',location:'El consultorio está en Av. 3G, Edif. Mini Center Veras Altas, Planta Baja, Local Nº 66-149, sector Las Mercedes, Maracaibo, Zulia.',whatsapp:'Abrir WhatsApp',qAppointment:'Consulta',qServices:'Servicios',qLocation:'Ubicación',bookOnline:'Reservar cita en línea'},
  en:{title:'Alma',subtitle:'Virtual assistant for Dr. Ydania',welcome:'Hi. I can help with general information about services, location, and how to request a consultation.',placeholder:'Type your question…',send:'Send',privacy:'Do not share sensitive medical information here. For personalized care, use WhatsApp.',fallback:'I can help with services, location, or how to request a consultation. For clinical or personal questions, please contact the office on WhatsApp.',appointment:'To request a consultation, use the WhatsApp button on this site to contact the office directly.',services:'Dr. Ydania provides medical aesthetics, weight and metabolism care, facial harmonization, radiofrequency, PRP, and body composition services. Treatment depends on a medical evaluation.',location:'The office is at Av. 3G, Edif. Mini Center Veras Altas, Ground Floor, Local Nº 66-149, Las Mercedes, Maracaibo, Zulia.',whatsapp:'Open WhatsApp',qAppointment:'Consultation',qServices:'Services',qLocation:'Location',bookOnline:'Book appointment online'},
  pt:{title:'Alma',subtitle:'Assistente virtual da Dra. Ydania',welcome:'Olá. Posso ajudar com informações gerais sobre serviços, localização e como solicitar uma consulta.',placeholder:'Digite sua pergunta…',send:'Enviar',privacy:'Não compartilhe informações médicas sensíveis aqui. Para atendimento personalizado, use o WhatsApp.',fallback:'Posso orientar sobre serviços, localização ou como solicitar uma consulta. Para dúvidas clínicas ou pessoais, fale com o consultório pelo WhatsApp.',appointment:'Para solicitar uma consulta, use o botão do WhatsApp deste site para falar diretamente com o consultório.',services:'A Dra. Ydania oferece medicina estética, controle de peso e metabolismo, harmonização facial, radiofrequência, PRP e composição corporal. A indicação depende de avaliação médica.',location:'O consultório fica na Av. 3G, Edif. Mini Center Veras Altas, térreo, Local Nº 66-149, Las Mercedes, Maracaibo, Zulia.',whatsapp:'Abrir WhatsApp',qAppointment:'Consulta',qServices:'Serviços',qLocation:'Localização',bookOnline:'Reservar consulta online'},
  it:{title:'Alma',subtitle:'Assistente virtuale della Dott.ssa Ydania',welcome:'Ciao. Posso aiutarti con informazioni generali su servizi, posizione e come richiedere una consulenza.',placeholder:'Scrivi la tua domanda…',send:'Invia',privacy:'Non condividere informazioni mediche sensibili qui. Per assistenza personalizzata, usa WhatsApp.',fallback:'Posso aiutarti con servizi, posizione o come richiedere una consulenza. Per domande cliniche o personali, contatta lo studio su WhatsApp.',appointment:'Per richiedere una consulenza, usa il pulsante WhatsApp del sito per contattare direttamente lo studio.',services:'La Dott.ssa Ydania offre medicina estetica, controllo del peso e metabolismo, armonizzazione facciale, radiofrequenza, PRP e composizione corporea. Il trattamento dipende da una valutazione medica.',location:'Lo studio si trova in Av. 3G, Edif. Mini Center Veras Altas, piano terra, Local Nº 66-149, Las Mercedes, Maracaibo, Zulia.',whatsapp:'Apri WhatsApp',qAppointment:'Consulenza',qServices:'Servizi',qLocation:'Posizione',bookOnline:'Prenota online'},
  ko:{title:'Alma',subtitle:'Ydania 의사의 가상 안내 도우미',welcome:'안녕하세요. 진료 분야, 위치, 상담 요청 방법에 대한 일반 정보를 안내해 드릴 수 있습니다.',placeholder:'질문을 입력하세요…',send:'보내기',privacy:'민감한 의료 정보는 여기에 입력하지 마세요. 개인 상담은 WhatsApp을 이용해 주세요.',fallback:'진료 분야, 위치, 상담 요청 방법을 안내할 수 있습니다. 개인적이거나 임상적인 질문은 WhatsApp으로 문의해 주세요.',appointment:'상담을 요청하려면 사이트의 WhatsApp 버튼을 이용해 진료실로 직접 문의하세요.',services:'Ydania 의사는 미용의학, 체중 및 대사 관리, 안면 조화, 고주파, PRP, 체성분 관리를 제공합니다. 치료 여부는 의학적 평가 후 결정됩니다.',location:'진료실: Av. 3G, Edif. Mini Center Veras Altas, Ground Floor, Local Nº 66-149, Las Mercedes, Maracaibo, Zulia.',whatsapp:'WhatsApp 열기',qAppointment:'상담',qServices:'진료 분야',qLocation:'위치',bookOnline:'온라인 예약'}
};
const lang=(document.documentElement.lang||'es').slice(0,2);
const chatText=chatbotCopy[lang]||chatbotCopy.es;
const floating=document.querySelector('.floating-controls');
if(floating){
  const toggle=document.createElement('button');
  toggle.className='ai-chat-toggle';
  toggle.type='button';
  toggle.setAttribute('aria-label',chatText.title);
  toggle.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 7.5h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H14l-6.5 4v-4H7a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 14h12M10 18h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  floating.appendChild(toggle);

  const panel=document.createElement('section');
  panel.className='ai-chat-panel';
  panel.setAttribute('aria-hidden','true');
  panel.innerHTML=`
    <div class="ai-chat-head">
      <div class="ai-chat-identity"><strong>${chatText.title}</strong><span>${chatText.subtitle||''}</span></div>
      <div class="ai-chat-window-actions">
        <button class="ai-chat-minimize" type="button" aria-label="Minimize chat" title="Minimize">−</button>
        <button class="ai-chat-maximize" type="button" aria-label="Maximize chat" title="Maximize">□</button>
        <button class="ai-chat-close" type="button" aria-label="Close chat" title="Close">×</button>
      </div>
    </div>
    <div class="ai-chat-messages"><div class="ai-msg ai-msg-bot">${chatText.welcome}</div></div>
    <div class="ai-chat-quick">
      <button type="button" data-chat-topic="appointment">${chatText.qAppointment}</button>
      <button type="button" data-chat-topic="services">${chatText.qServices}</button>
      <button type="button" data-chat-topic="location">${chatText.qLocation}</button>
    </div>
    <form class="ai-chat-form"><input type="text" autocomplete="off" placeholder="${chatText.placeholder}" aria-label="${chatText.placeholder}"><button type="submit">${chatText.send}</button></form>
    <a class="ai-chat-booking-link" href="${lang==='es'?'/booking/':'/'+lang+'/booking/'}">${chatText.bookOnline}</a>
    <div class="ai-chat-privacy">${chatText.privacy}</div>
  `;
  document.body.appendChild(panel);

  const messages=panel.querySelector('.ai-chat-messages');
  const input=panel.querySelector('input');
  const chatHistory=[];
  const formatBotMessage=(text='')=>{
    const escaped=String(text)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
    const lines=escaped.split(/\r?\n/);
    let html='',inList=false;
    const closeList=()=>{if(inList){html+='</ul>';inList=false;}};
    for(const rawLine of lines){
      const line=rawLine.trim();
      if(!line){closeList();continue;}
      const formatted=line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
      const bullet=formatted.match(/^[-•]\s+(.*)$/);
      if(bullet){
        if(!inList){html+='<ul>';inList=true;}
        html+='<li>'+bullet[1]+'</li>';
      }else{
        closeList();
        html+='<p>'+formatted+'</p>';
      }
    }
    closeList();
    return html;
  };
  const addMsg=(text,who='bot')=>{
    const el=document.createElement('div');
    el.className='ai-msg '+(who==='user'?'ai-msg-user':'ai-msg-bot');
    if(who==='user') el.textContent=text;
    else el.innerHTML=formatBotMessage(text);
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
  const askAI=async(value)=>{
    const prior=chatHistory.slice(-6);
    chatHistory.push({role:'user',text:value});
    try{
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:value,language:lang,history:prior})});
      const data=await res.json();
      if(!res.ok||!data.ok)throw new Error(data.error||'AI unavailable');
      addMsg(data.answer);
      chatHistory.push({role:'assistant',text:data.answer});
      const privacy=panel.querySelector('.ai-chat-privacy');
      if(data.disclaimer) privacy.textContent=data.disclaimer+' '+chatText.privacy;
    }catch(err){
      addMsg(lang==='es'?'El asistente de IA no está disponible en este momento. Intenta nuevamente en unos segundos.':chatText.fallback);
    }
  };
  const setOpen=(open)=>{
    panel.classList.toggle('open',open);
    panel.setAttribute('aria-hidden',open?'false':'true');
    if(!open) panel.classList.remove('maximized');
    if(open) setTimeout(()=>input.focus(),50);
  };
  toggle.addEventListener('click',()=>setOpen(!panel.classList.contains('open')));
  panel.querySelector('.ai-chat-close').addEventListener('click',()=>setOpen(false));
  const minimizeButton=panel.querySelector('.ai-chat-minimize');
  const maximizeButton=panel.querySelector('.ai-chat-maximize');
  const syncWindowControls=()=>{
    const expanded=panel.classList.contains('maximized');
    minimizeButton.classList.toggle('is-enabled',expanded);
    minimizeButton.setAttribute('aria-disabled',expanded?'false':'true');
  };
  minimizeButton.addEventListener('click',()=>{
    if(!panel.classList.contains('maximized')) return;
    panel.classList.remove('maximized');
    syncWindowControls();
  });
  maximizeButton.addEventListener('click',()=>{
    panel.classList.toggle('maximized');
    syncWindowControls();
  });
  syncWindowControls();
  const topicPrompts={
    es:{appointment:'¿Cómo puedo solicitar una cita y cómo funciona el proceso de reserva?',services:'¿Qué servicios ofrece la Dra. Ydania y para qué se usan en términos generales?',location:'¿Dónde está ubicado el consultorio y cómo puedo contactarlo?'},
    en:{appointment:'How can I request an appointment and how does the booking process work?',services:'What services does Dr. Ydania offer and what are they generally used for?',location:'Where is the office and how can I contact it?'},
    pt:{appointment:'Como posso solicitar uma consulta e como funciona a reserva?',services:'Quais serviços a Dra. Ydania oferece e para que são usados em geral?',location:'Onde fica o consultório e como posso entrar em contato?'},
    it:{appointment:'Come posso richiedere un appuntamento e come funziona la prenotazione?',services:'Quali servizi offre la Dott.ssa Ydania e a cosa servono in generale?',location:'Dove si trova lo studio e come posso contattarlo?'},
    ko:{appointment:'예약은 어떻게 요청하고 절차는 어떻게 진행되나요?',services:'Ydania 의사는 어떤 진료와 시술을 제공하며 일반적으로 어떤 목적으로 사용되나요?',location:'진료실은 어디에 있고 어떻게 연락할 수 있나요?'}
  };
  panel.querySelectorAll('[data-chat-topic]').forEach(btn=>btn.addEventListener('click',()=>{
    const topic=btn.dataset.chatTopic;
    const prompt=(topicPrompts[lang]||topicPrompts.es)[topic];
    addMsg(btn.textContent,'user');
    askAI(prompt);
  }));
  panel.querySelector('.ai-chat-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const value=input.value.trim();
    if(!value)return;
    addMsg(value,'user');
    input.value='';
    await askAI(value);
  });
}
