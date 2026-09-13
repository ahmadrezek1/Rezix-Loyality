import { NextResponse } from 'next/server';
import { getBusinessBySlug,getCustomerByPhone } from '@/lib/store';
import { createOtpChallenge,otpSendAllowed } from '@/lib/auth-store';
import { sendOtpSms } from '@/lib/sms';
import { audit,sameOrigin } from '@/lib/security';
import { billingOperational } from '@/lib/billing';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
 const body=await req.json().catch(()=>null) as any;const slug=String(body?.slug||'').trim().toLowerCase();const name=String(body?.name||'').trim().slice(0,100);const phone=String(body?.phone||'').trim().replace(/[\s()\/-]/g,'');const privacyAcknowledged=body?.privacyAcknowledged===true;const marketingConsent=body?.marketingConsent===true;
 if(!slug||name.length<2||!/^\+[1-9]\d{7,14}$/.test(phone)||!privacyAcknowledged)return NextResponse.json({error:'Bitte Name, internationale Telefonnummer (+43…) und Datenschutzhinweise prüfen.'},{status:400});
 const business=await getBusinessBySlug(slug);if(!business)return NextResponse.json({error:'Salon ist nicht verfügbar'},{status:404});if(!billingOperational(business))return NextResponse.json({error:'Das Loyalty-Programm dieses Salons ist derzeit nicht aktiv.'},{status:402});
 if(!await otpSendAllowed(business.id,phone))return NextResponse.json({error:'Zu viele Codes angefordert. Bitte 15 Minuten warten.'},{status:429});
 const existing=await getCustomerByPhone(business.id,phone);const challenge=await createOtpChallenge({businessId:business.id,phone,name:existing?.name||name,privacyAck:privacyAcknowledged,marketing:marketingConsent});const sent=await sendOtpSms(phone,challenge.code);if(!sent)return NextResponse.json({error:'SMS konnte nicht gesendet werden. Bitte später erneut versuchen.'},{status:503});
 await audit({actorType:'kunde',actorId:existing?.id||null,businessId:business.id,action:'auth.otp.requested',req,metadata:{existing:!!existing}}).catch(()=>{});
 return NextResponse.json({challengeId:challenge.challengeId,devOtp:process.env.NODE_ENV!=='production'?challenge.code:undefined});
}
