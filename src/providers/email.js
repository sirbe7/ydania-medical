const INFO_ADDRESS='info@draydania.com';
const INFO_CC='consultoriodraydania04@gmail.com';

function normalizeRecipients(to){
  return (Array.isArray(to)?to:[to]).filter(Boolean);
}

function shouldCcInfo(recipients){
  return recipients.some(x=>String(x).trim().toLowerCase()===INFO_ADDRESS);
}

export async function sendEmail(env,{to,subject,text,html}){
  const recipients=normalizeRecipients(to);
  const ccInfo=shouldCcInfo(recipients);

  if(env.EMAIL_PROVIDER==='cloudflare' && env.MAILER){
    for(const address of recipients){
      await env.MAILER.send({from:env.EMAIL_FROM||'agenda@agenda.draydania.com',to:address,subject,text,html});
    }
    if(ccInfo){
      await env.MAILER.send({from:env.EMAIL_FROM||'agenda@agenda.draydania.com',to:INFO_CC,subject,text,html});
    }
    return {provider:'cloudflare'};
  }

  if(env.RESEND_API_KEY){
    const payload={
      from:env.EMAIL_FROM||'DraYdania Agenda <agenda@agenda.draydania.com>',
      to:recipients,
      subject,
      text,
      html
    };
    if(ccInfo) payload.cc=[INFO_CC];
    const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.RESEND_API_KEY}`},body:JSON.stringify(payload)});
    if(!res.ok) throw new Error(`Email ${res.status}: ${(await res.text()).slice(0,400)}`);
    return {provider:'resend',...(await res.json())};
  }

  throw new Error('No outbound email provider configured');
}
