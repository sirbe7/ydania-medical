document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

const scrollTopButton=document.querySelector('.scroll-top');
if(scrollTopButton){
  const updateScrollTop=()=>scrollTopButton.classList.toggle('visible',window.scrollY>320);
  updateScrollTop();
  window.addEventListener('scroll',updateScrollTop,{passive:true});
  scrollTopButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}
