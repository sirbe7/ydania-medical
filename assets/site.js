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

  let timer=setInterval(()=>showSlide((index+1)%slides.length),5000);
  const resetTimer=()=>{
    clearInterval(timer);
    timer=setInterval(()=>showSlide((index+1)%slides.length),5000);
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
