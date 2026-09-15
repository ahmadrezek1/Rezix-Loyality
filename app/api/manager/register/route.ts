import { NextResponse, after } from 'next/server';
import { businessSlugExists,staffEmailExists,createBusinessWithManager } from '@/lib/store';
import { consumeRateLimit,requestIp,sameOrigin,escapeHtml,audit } from '@/lib/security';
import { issueManagerCode } from '@/lib/manager-verification';
import { sendAuthEmail } from '@/lib/mailer';
export const runtime='nodejs';

type Field='name'|'slug'|'rewardText'|'rewardTarget'|'cardTitle'|'website'|'managerName'|'email'|'password'|'terms';

function wantsJson(req:Request){return req.headers.get('x-rezix-client')==='wizard'||req.headers.get('accept')?.includes('application/json')}
function failure(req:Request,error:string,field?:Field,message?:string,status=400){
 if(wantsJson(req))return NextResponse.json({ok:false,error,field,message},{status});
 return NextResponse.redirect(new URL('/manager/register?error='+encodeURIComponent(error)+(field?'&field='+encodeURIComponent(field):''),req.url),303);
}

export async function POST(req:Request){
 if(!sameOrigin(req))return failure(req,'server',undefined,'Ungültige Anfrage. Bitte lade die Seite neu.',403);
 try{
  if(!await consumeRateLimit('manager-register-ip',requestIp(req),5,60))return failure(req,'limited',undefined,undefined,429);
  const f=await req.formData();
  const industry=String(f.get('industry')||'other');const programType=String(f.get('programType')||'stamps') as 'stamps'|'points';
  const locationName=String(f.get('locationName')||'').trim();const street=String(f.get('street')||'').trim();const postalCode=String(f.get('postalCode')||'').trim();const city=String(f.get('city')||'').trim();const website=String(f.get('website')||'').trim();const cardTitle=String(f.get('cardTitle')||'Deine Treuekarte').trim();
  const name=String(f.get('name')||'').trim();const slug=String(f.get('slug')||'').trim().toLowerCase();const managerName=String(f.get('managerName')||'').trim();const managerEmail=String(f.get('email')||'').trim().toLowerCase();const managerPassword=String(f.get('password')||'');const rewardText=String(f.get('rewardText')||'').trim();const rewardTarget=Number(f.get('rewardTarget'));
  if(!name||name.length>120)return failure(req,'invalid','name');
  if(!slug||slug.length>60||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))return failure(req,'invalid','slug');
  if(!rewardText||rewardText.length>160)return failure(req,'invalid','rewardText');
  if(!cardTitle||cardTitle.length>80)return failure(req,'invalid','cardTitle');
  if(!Number.isInteger(rewardTarget)||rewardTarget<2||rewardTarget>30)return failure(req,'invalid','rewardTarget');
  if(website){try{const u=new URL(website);if(u.protocol!=='http:'&&u.protocol!=='https:')return failure(req,'invalid','website')}catch{return failure(req,'invalid','website')}}
  if(!managerName||managerName.length>100)return failure(req,'invalid','managerName');
  if(managerEmail.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail))return failure(req,'invalid','email');
  if(managerPassword.length<12||managerPassword.length>128)return failure(req,'invalid','password');
  if(f.get('terms')!=='on')return failure(req,'invalid','terms');
  if(!await consumeRateLimit('manager-register-email',managerEmail,3,60))return failure(req,'limited','email',undefined,429);

  // These independent lookups used to run one after another. Running them together cuts a DB round trip from the visible request.
  const [slugTaken,emailTaken]=await Promise.all([businessSlugExists(slug),staffEmailExists(managerEmail)]);
  if(slugTaken)return failure(req,'unavailable','slug','Diese Rezix-Adresse ist bereits vergeben.',409);
  if(emailTaken)return failure(req,'unavailable','email','Für diese E-Mail-Adresse existiert bereits ein Zugang.',409);

  const created=await createBusinessWithManager({name,slug,industry,loyaltyProgramType:programType,locationName,street,postalCode,city,country:'AT',website,cardTitle,managerName,managerEmail,managerPassword,rewardText,rewardTarget});
  const challenge=await issueManagerCode(created.managerId);
  const redirectUrl='/manager/verify?challenge='+challenge.challengeId;

  // Email delivery and audit logging must not keep the registration screen waiting.
  after(async()=>{
   let emailSent=false;
   try{emailSent=await sendAuthEmail({to:managerEmail,subject:'Rezix – Dein Bestätigungscode',html:`<h2>Willkommen bei Rezix</h2><p>Dein Bestätigungscode für <b>${escapeHtml(name)}</b>:</p><p style="font-size:32px;letter-spacing:6px"><b>${challenge.code}</b></p><p>Der Code ist 10 Minuten gültig. Gib ihn auf der Rezix-Webseite ein.</p>`});}catch{}
   await audit({businessId:created.businessId,action:'business.registered',targetType:'business',targetId:created.businessId,req,metadata:{termsAccepted:true,emailSent}}).catch(()=>{});
  });

  if(wantsJson(req))return NextResponse.json({ok:true,redirect:redirectUrl});
  return NextResponse.redirect(new URL(redirectUrl,req.url),303);
 }catch(err:any){
  console.error('manager registration failed',err);
  if(err?.code==='23505'){
   const text=String(err?.constraint||err?.detail||'').toLowerCase();
   if(text.includes('slug'))return failure(req,'unavailable','slug','Diese Rezix-Adresse ist bereits vergeben.',409);
   if(text.includes('email'))return failure(req,'unavailable','email','Für diese E-Mail-Adresse existiert bereits ein Zugang.',409);
  }
  if(err?.code==='42703'||err?.code==='42P01')return failure(req,'setup',undefined,'Die Datenbank ist noch nicht auf dem neuesten Stand. Bitte führe die Rezix-Migration aus.',503);
  return failure(req,'server',undefined,'Die Registrierung konnte nicht abgeschlossen werden. Bitte versuche es erneut.',500);
 }
}
