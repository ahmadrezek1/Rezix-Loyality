import { NextResponse } from 'next/server';
import { businessSlugExists,staffEmailExists,createBusinessWithManager } from '@/lib/store';
import { consumeRateLimit,requestIp,sameOrigin,escapeHtml,audit } from '@/lib/security';
import { issueManagerCode } from '@/lib/manager-verification';
import { sendAuthEmail } from '@/lib/mailer';
export const runtime='nodejs';
export async function POST(req:Request){
 const redirect=(query:string)=>NextResponse.redirect(new URL('/manager/register?'+query,req.url),303);
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 try{
  if(!await consumeRateLimit('manager-register-ip',requestIp(req),5,60))return redirect('error=limited');
  const f=await req.formData();const name=String(f.get('name')||'').trim();const slug=String(f.get('slug')||'').trim();const managerName=String(f.get('managerName')||'').trim();const managerEmail=String(f.get('email')||'').trim().toLowerCase();const managerPassword=String(f.get('password')||'');const rewardText=String(f.get('rewardText')||'').trim();const rewardTarget=Number(f.get('rewardTarget'));
  if(!name||name.length>120||!managerName||managerName.length>100||!slug||slug.length>60||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)||managerEmail.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)||managerPassword.length<12||managerPassword.length>128||!rewardText||rewardText.length>160||!Number.isInteger(rewardTarget)||rewardTarget<2||rewardTarget>30||f.get('terms')!=='on')return redirect('error=invalid');
  if(!await consumeRateLimit('manager-register-email',managerEmail,3,60))return redirect('error=limited');
  if(await businessSlugExists(slug)||await staffEmailExists(managerEmail))return redirect('error=unavailable');
  const created=await createBusinessWithManager({name,slug,managerName,managerEmail,managerPassword,rewardText,rewardTarget});
  let emailSent=false;let challengeId='';
  try{const challenge=await issueManagerCode(created.managerId);challengeId=challenge.challengeId;emailSent=await sendAuthEmail({to:managerEmail,subject:'Rezix – Dein Bestätigungscode',html:`<h2>Willkommen bei Rezix</h2><p>Dein Bestätigungscode für <b>${escapeHtml(name)}</b>:</p><p style="font-size:32px;letter-spacing:6px"><b>${challenge.code}</b></p><p>Der Code ist 10 Minuten gültig. Gib ihn auf der Rezix-Webseite ein.</p>`});}catch{/* Account remains available for code resend. */}
  await audit({businessId:created.businessId,action:'business.registered',targetType:'business',targetId:created.businessId,req,metadata:{termsAccepted:true,emailSent}}).catch(()=>{});
  return NextResponse.redirect(new URL('/manager/verify?challenge='+challengeId+(emailSent?'':'&mailError=1'),req.url),303);
 }catch{return redirect('error=invalid');}
}
