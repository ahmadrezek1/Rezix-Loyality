import { NextResponse } from 'next/server';
import { getBusinessBySlug,getCustomerByEmail } from '@/lib/store';
import { createOtpChallenge,otpSendAllowed } from '@/lib/auth-store';
import { sendAuthEmail } from '@/lib/mailer';
import { audit,sameOrigin,consumeRateLimit,requestIp,escapeHtml } from '@/lib/security';
import { billingOperational } from '@/lib/billing';

const emailOk=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
 if(!await consumeRateLimit('customer-otp-ip',requestIp(req),20,15))return NextResponse.json({error:'Zu viele Anfragen. Bitte später erneut versuchen.'},{status:429});
 const body=await req.json().catch(()=>null) as any;
 const slug=String(body?.slug||'').trim().toLowerCase();
 const name=String(body?.name||'').trim().slice(0,100);
 const email=String(body?.email||'').trim().toLowerCase().slice(0,254);
 const privacyAcknowledged=body?.privacyAcknowledged===true;
 if(!slug||!name||!emailOk(email)||!privacyAcknowledged)return NextResponse.json({error:'Bitte Name, gültige E-Mail-Adresse sowie AGB/Datenschutzerklärung bestätigen.'},{status:400});
 const business=await getBusinessBySlug(slug);if(!business||!business.active)return NextResponse.json({error:'Salon ist nicht verfügbar'},{status:404});
 const existing=await getCustomerByEmail(business.id,email);
 if(!existing&&!billingOperational(business))return NextResponse.json({error:'Das Loyalty-Programm dieses Salons ist derzeit nicht aktiv.'},{status:402});
 if(!await consumeRateLimit('customer-otp-email',business.id+'|'+email,5,15))return NextResponse.json({error:'Zu viele Codes angefordert. Bitte 15 Minuten warten.'},{status:429});
 const challenge=await createOtpChallenge({businessId:business.id,email,name:existing?.name||name,privacyAck:privacyAcknowledged,marketing:body?.marketingConsent===true});
 const sent=await sendAuthEmail({to:email,subject:`Dein Rezix Sicherheitscode für ${business.name}`,html:`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Rezix Loyalty</h2><p>Dein Sicherheitscode für <b>${escapeHtml(business.name)}</b> lautet:</p><div style="font-size:34px;font-weight:800;letter-spacing:8px;padding:18px 0">${challenge.code}</div><p>Der Code ist 10 Minuten gültig. Wenn du diese Anmeldung nicht gestartet hast, kannst du diese E-Mail ignorieren.</p></div>`});
 if(!sent)return NextResponse.json({error:'E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.'},{status:503});
 await audit({actorType:'kunde',actorId:existing?.id||null,businessId:business.id,action:'auth.otp.requested',req,metadata:{channel:'email',existing:!!existing}}).catch(()=>{});
 return NextResponse.json({challengeId:challenge.challengeId,devOtp:process.env.NODE_ENV!=='production'?challenge.code:undefined});
}
