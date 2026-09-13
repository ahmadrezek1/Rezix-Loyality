export async function sendAuthEmail(input:{to:string;subject:string;html:string}){
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.REZIX_EMAIL_FROM || 'Rezix <noreply@rezix.at>';
  if(!apiKey){
    if(process.env.NODE_ENV!=='production') console.log('[Rezix mail dev]',input.to,input.subject,input.html.replace(/<[^>]+>/g,' '));
    return process.env.NODE_ENV!=='production';
  }
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:[input.to],subject:input.subject,html:input.html})});
  return r.ok;
}
export function appBaseUrl(req?:Request){
  if(process.env.NEXT_PUBLIC_APP_URL)return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/,'');
  if(req)return new URL(req.url).origin;
  return 'http://localhost:3000';
}
