export async function sendAuthEmail(input:{to:string;subject:string;html:string}){
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.REZIX_EMAIL_FROM || 'Rezix <noreply@rezix.at>';
  if(!apiKey){console.error('[mail] RESEND_API_KEY is missing');return false;}
  try{
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:[input.to],subject:input.subject,html:input.html}),signal:AbortSignal.timeout(15000)});
    if(!r.ok){const error=await r.json().catch(()=>({}));console.error('[mail] Delivery rejected',{status:r.status,name:typeof error.name==='string'?error.name:'unknown'});}
    return r.ok;
  }catch{console.error('[mail] Delivery request failed');return false;}
}
export function appBaseUrl(req?:Request){
  if(process.env.NEXT_PUBLIC_APP_URL)return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/,'');
  if(req)return new URL(req.url).origin;
  return 'http://localhost:3000';
}
