document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

// Floating quick actions. Set the clinic's public WhatsApp number below in international format, digits only.
// Example format: 584121234567 (do not include +, spaces, or punctuation).
const WHATSAPP_NUMBER = '584246398440';
const WA_MESSAGES = {
  es: 'Hola, quisiera solicitar una consulta con la Dra. Ydania.',
  en: 'Hello, I would like to request a consultation with Dr. Ydania.',
  pt: 'Olá, gostaria de solicitar uma consulta com a Dra. Ydania.',
  it: 'Buongiorno, vorrei richiedere una consulenza con la Dott.ssa Ydania.',
  ko: '안녕하세요. Ydania 선생님과 상담을 예약하고 싶습니다.'
};
const pageLang = (document.documentElement.lang || 'es').slice(0,2);
const WHATSAPP_MESSAGE = WA_MESSAGES[pageLang] || WA_MESSAGES.es;

const actions = document.createElement('div');
actions.className = 'quick-actions';

const wa = document.createElement('a');
wa.className = 'whatsapp-fab';
wa.setAttribute('aria-label','Contactar por WhatsApp');
wa.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.11 17.34c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.98 2.63 1.11 2.81c.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.55.58.65.21 1.24.18 1.71.11.52-.08 1.6-.66 1.83-1.29.23-.64.23-1.18.16-1.29-.07-.11-.25-.18-.52-.32zM16.03 4.8c-6.17 0-11.19 5.02-11.19 11.19 0 1.97.51 3.89 1.49 5.58L4.75 27.2l5.76-1.51a11.13 11.13 0 0 0 5.52 1.46h.01c6.17 0 11.19-5.02 11.19-11.19S22.2 4.8 16.03 4.8zm0 20.47h-.01a9.27 9.27 0 0 1-4.73-1.29l-.34-.2-3.42.9.91-3.33-.22-.34a9.28 9.28 0 0 1-1.43-4.95c0-5.12 4.17-9.29 9.3-9.29 5.12 0 9.29 4.17 9.29 9.29s-4.17 9.21-9.35 9.21z"/></svg><span>WhatsApp</span>`;
if (WHATSAPP_NUMBER) {
  wa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  wa.target = '_blank';
  wa.rel = 'noopener noreferrer';
} else {
  wa.dataset.unconfigured = 'true';
}

const topBtn = document.createElement('button');
topBtn.className = 'top-fab';
topBtn.type = 'button';
topBtn.setAttribute('aria-label','Volver arriba');
topBtn.innerHTML = '↑';
topBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
const toggleTop=()=>topBtn.classList.toggle('show',window.scrollY>700);
window.addEventListener('scroll',toggleTop,{passive:true});
toggleTop();

actions.append(wa,topBtn);
document.body.appendChild(actions);
