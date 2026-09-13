import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { createStaff,staffEmailExists,getBusinessById } from '@/lib/store';
import { createOneTimeToken } from '@/lib/auth-store';
import { appBaseUrl,sendAuthEmail } from '@/lib/mailer';
import { audit,sameOrigin } from '@/lib/security';
import { assertCanCreateFriseur } from '@/lib/billing';
export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
  const s=await currentSession();
  if(!s||s.role!=='manager'||!s.businessId)return NextResponse.redirect(new URL('/manager/login',req.url),303);
  const f=await req.formData();const name=String(f.get('name')||'').trim().slice(0,100);const email=String(f.get('email')||'').trim().toLowerCase();const password=String(f.get('password')||'');
  if(!name||!email.includes('@')||password.length<12)return NextResponse.redirect(new URL('/manager/friseure?friseurError=1',req.url),303);
  if(await staffEmailExists(email))return NextResponse.redirect(new URL('/manager/friseure?friseurExists=1',req.url),303);
  const business=await getBusinessById(s.businessId);if(!business)return NextResponse.redirect(new URL('/manager/friseure?billingBlocked=1',req.url),303);const entitlement=await assertCanCreateFriseur(business);if(!entitlement.ok)return NextResponse.redirect(new URL(`/manager/friseure?billingBlocked=1&billingReason=${entitlement.reason}&billingLimit=${entitlement.limit}`,req.url),303);
  let staffId:string;try{staffId=await createStaff({businessId:s.businessId,name,email,password,role:'friseur'});}catch{return NextResponse.redirect(new URL('/manager/friseure?friseurError=1',req.url),303);}
  const token=await createOneTimeToken(staffId,'friseur','email_verify',1440);
  const url=`${appBaseUrl(req)}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const sent=await sendAuthEmail({to:email,subject:'Rezix – E-Mail bestätigen',html:`<h2>Willkommen bei Rezix</h2><p>Bestätige deine E-Mail-Adresse, bevor du dich als Friseur anmeldest.</p><p><a href="${url}">E-Mail bestätigen</a></p><p>Der Link ist 24 Stunden gültig.</p>`});
  await audit({session:s,businessId:s.businessId,action:'friseur.created',targetType:'staff_user',targetId:staffId,req,metadata:{email,role:'friseur',name,emailSent:sent}});
  return NextResponse.redirect(new URL(`/manager/friseure?friseurAdded=1${sent?'':'&mailError=1'}`,req.url),303);
}
