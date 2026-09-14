import { NextResponse } from 'next/server';
import { businessSlugExists,staffEmailExists,createBusinessWithManager } from '@/lib/store';
import { consumeRateLimit,requestIp,sameOrigin,escapeHtml,audit } from '@/lib/security';
import { issueManagerCode } from '@/lib/manager-verification';
import { sendAuthEmail } from '@/lib/mailer';
export const runtime='nodejs';
export async function POST(req:Request){
 const redirect=(error:string,field?:string)=>NextResponse.redirect(new URL('/manager/register?error='+encodeURIComponent(error)+(field?'&field='+encodeURIComponent(field):''),req.url),303);
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 try{
  if(!await consumeRateLimit('manager-register-ip',requestIp(req),5,60))return redirect('limited');
  const f=await req.formData();
  const industry=String(f.get('industry')||'other');const programType=String(f.get('programType')||'stamps') as 'stamps'|'points';
  const locationName=String(f.get('locationName')||'').trim();const street=String(f.get('street')||'').trim();const postalCode=String(f.get('postalCode')||'').trim();const city=String(f.get('city')||'').trim();const website=String(f.get('website')||'').trim();const cardTitle=String(f.get('cardTitle')||'Deine Treuekarte').trim();
  const name=String(f.get('name')||'').trim();const slug=String(f.get('slug')||'').trim().toLowerCase();const managerName=String(f.get('managerName')||'').trim();const managerEmail=String(f.get('email')||'').trim().toLowerCase();const managerPassword=String(f.get('password')||'');const rewardText=String(f.get('rewardText')||'').trim();const rewardTarget=Number(f.get('rewardTarget'));
  if(!name||name.length>120)return redirect('invalid','name');
  if(!slug||slug.length>60||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))return redirect('invalid','slug');
  if(!rewardText||rewardText.length>160)return redirect('invalid','rewardText');
  if(!cardTitle||cardTitle.length>80)return redirect('invalid','cardTitle');
  if(!Number.isInteger(rewardTarget)||rewardTarget<2||rewardTarget>30)return redirect('invalid','rewardTarget');
  if(website){try{const u=new URL(website);if(u.protocol!=='http:'&&u.protocol!=='https:')return redirect('invalid','website')}catch{return redirect('invalid','website')}}
  if(!managerName||managerName.length>100)return redirect('invalid','managerName');
  if(managerEmail.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail))return redirect('invalid','email');
  if(managerPassword.length<12||managerPassword.length>128)return redirect('invalid','password');
  if(f.get('terms')!=='on')return redirect('invalid','terms');
  if(!await consumeRateLimit('manager-register-email',managerEmail,3,60))return redirect('limited','email');
  if(await businessSlugExists(slug))return redirect('unavailable','slug');
  if(await staffEmailExists(managerEmail))return redirect('unavailable','email');
  const created=await createBusinessWithManager({name,slug,industry,loyaltyProgramType:programType,locationName,street,postalCode,city,country:'AT',website,cardTitle,managerName,managerEmail,managerPassword,rewardText,rewardTarget});
  let emailSent=false;let challengeId='';
  try{const challenge=await issueManagerCode(created.managerId);challengeId=challenge.challengeId;emailSent=await sendAuthEmail({to:managerEmail,subject:'Rezix – Dein Bestätigungscode',html:`<h2>Willkommen bei Rezix</h2><p>Dein Bestätigungscode für <b>${escapeHtml(name)}</b>:</p><p style="font-size:32px;letter-spacing:6px"><b>${challenge.code}</b></p><p>Der Code ist 10 Minuten gültig. Gib ihn auf der Rezix-Webseite ein.</p>`});}catch{/* Account remains available for code resend. */}
  await audit({businessId:created.businessId,action:'business.registered',targetType:'business',targetId:created.businessId,req,metadata:{termsAccepted:true,emailSent}}).catch(()=>{});
  return NextResponse.redirect(new URL('/manager/verify?challenge='+challengeId+(emailSent?'':'&mailError=1'),req.url),303);
 }catch(err){console.error('manager registration failed',err);return redirect('invalid');}
}
