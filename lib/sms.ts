export async function sendOtpSms(phone:string,code:string){
  const sid=process.env.TWILIO_ACCOUNT_SID;
  const auth=process.env.TWILIO_AUTH_TOKEN;
  const from=process.env.TWILIO_FROM_NUMBER;
  if(!sid||!auth||!from){
    if(process.env.NODE_ENV!=='production') console.log(`[Rezix SMS dev] ${phone}: ${code}`);
    return process.env.NODE_ENV!=='production';
  }
  const body=new URLSearchParams({To:phone,From:from,Body:`Rezix Sicherheitscode: ${code}. Gültig für 10 Minuten.`});
  const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{method:'POST',headers:{authorization:`Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,'content-type':'application/x-www-form-urlencoded'},body});
  return r.ok;
}
