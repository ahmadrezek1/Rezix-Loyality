import { NextResponse } from 'next/server';
import { getStaffByEmail } from '@/lib/store';
import { createOneTimeToken,canIssueAuthToken,isAdminEmailVerified } from '@/lib/auth-store';
import { appBaseUrl,sendAuthEmail } from '@/lib/mailer';
import { consumeRateLimit,requestIp,sameOrigin } from '@/lib/security';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const f=await req.formData();const role=f.get('role')==='admin'?'admin':f.get('role')==='friseur'?'friseur':'manager';
 const email=String(f.get('email')||'').trim().toLowerCase();const done=()=>NextResponse.redirect(new URL(`/auth/forgot?role=${role}&sent=1`,req.url),303);
 if(!await consumeRateLimit('reset-ip',requestIp(req),15,15)||!await consumeRateLimit('reset-email',email,3,15))return done();
 const staff=role==='admin'?null:await getStaffByEmail(email);
 const valid=role==='admin'?email===(process.env.REZIX_ADMIN_EMAIL||'').trim().toLowerCase()&&await isAdminEmailVerified(email):staff?.role===role;
 if(valid){const actor=role==='admin'?email:staff!.id;
  if(await canIssueAuthToken(actor,'password_reset')){const token=await createOneTimeToken(actor,role,'password_reset',30);const url=`${appBaseUrl(req)}/auth/reset?token=${encodeURIComponent(token)}`;await sendAuthEmail({to:email,subject:'Rezix Passwort zurücksetzen',html:`<h2>Passwort zurücksetzen</h2><p>Dieser Link ist 30 Minuten gültig.</p><a href="${url}">Neues Passwort festlegen</a>`});}
 }
 return done();
}
