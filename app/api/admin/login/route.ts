import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/store';
import { audit,clearAuthFailures,isBlocked,recordAuthFailure } from '@/lib/security';
import { completeSession } from '@/lib/login-flow';
import { isAdminEmailVerified,issueAdminEmailVerification } from '@/lib/auth-store';
import { appBaseUrl,sendAuthEmail } from '@/lib/mailer';

export async function POST(req:Request){
 const form=await req.formData();
 const email=String(form.get('email')||'').trim().toLowerCase();
 const password=String(form.get('password')||'');
 if(await isBlocked('admin-login',email||'unknown',req))return NextResponse.redirect(new URL('/admin/login?blocked=1',req.url),303);
 const expected=(process.env.REZIX_ADMIN_EMAIL||'').trim().toLowerCase(),salt=process.env.REZIX_ADMIN_PASSWORD_SALT||'',hash=process.env.REZIX_ADMIN_PASSWORD_HASH||'';
 if(!expected||!salt||!hash||email!==expected||!verifyPassword(password,salt,hash)){
   await recordAuthFailure('admin-login',email||'unknown',req);
   await audit({actorType:'admin',actorId:email||null,action:'auth.login.failed',req,metadata:{scope:'admin'}}).catch(()=>{});
   return NextResponse.redirect(new URL('/admin/login?error=1',req.url),303)
 }
 if(!await isAdminEmailVerified(expected)){
   const token=await issueAdminEmailVerification(expected);
   const verifyUrl=`${appBaseUrl(req)}/api/admin/verify-email?token=${encodeURIComponent(token)}`;
   const sent=await sendAuthEmail({to:expected,subject:'Rezix – Admin E-Mail bestätigen',html:`<h2>Rezix Admin bestätigen</h2><p>Bestätige deine E-Mail-Adresse einmalig. Danach erfolgt die Anmeldung nur noch mit E-Mail und Passwort.</p><p><a href="${verifyUrl}">E-Mail-Adresse bestätigen</a></p><p>Der Link ist 24 Stunden gültig.</p>`});
   await audit({actorType:'admin',actorId:expected,action:'auth.email_verification.requested',req,metadata:{sent}}).catch(()=>{});
   return NextResponse.redirect(new URL(`/admin/login?verify=1${sent?'':'&mailError=1'}`,req.url),303);
 }
 await clearAuthFailures('admin-login',email,req);
 await audit({actorType:'admin',actorId:expected,action:'auth.login.success',req,metadata:{method:'password'}}).catch(()=>{});
 return completeSession(req,{role:'admin',sub:expected,name:'Admin'},'/admin');
}
