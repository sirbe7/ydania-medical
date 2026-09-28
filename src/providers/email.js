export async function sendEmail(env,{to,subject,text,html}){
  if(env.EMAIL_PROVIDER==='cloudflare' && env.MAILER){
    const recipients=Array.isArray(to)?to:[to];
    for(const address of recipients){
      await env.MAILER.send({from:env.EMAIL_FROM||'agenda@agenda.draydania.com',to:address,subject,text,html});
    }
    return {provider:'cloudflare'};
  }
  if(env.RESEND_API_KEY){
    const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.RESEND_API_KEY}`},body:JSON.stringify({from:env.EMAIL_FROM||'DraYdania Agenda <agenda@agenda.draydania.com>',to:Array.isArray(to)?to:[to],subject,text,html})});
    if(!res.ok) throw new Error(`Email ${res.status}: ${(await res.text()).slice(0,400)}`);
    return {provider:'resend',...(await res.json())};
  }
  throw new Error('No outbound email provider configured');
}