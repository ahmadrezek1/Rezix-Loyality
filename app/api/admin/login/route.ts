import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/store';
import { audit,clearAuthFailures,isBlocked,recordAuthFailure } from '@/lib/security';
import { startPrivilegedLogin } from '@/lib/login-flow';
export async function POST(req:Request){
 const form=await req.formData();const email=String(form.get('email')||'').trim().toLowerCase();const password=String(form.get('password')||'');
 if(await isBlocked('admin-login',email||'unknown',req))return NextResponse.redirect(new URL('/admin/login?blocked=1',req.url),303);
 const expected=(process.env.REZIX_ADMIN_EMAIL||'').trim().toLowerCase(),salt=process.env.REZIX_ADMIN_PASSWORD_SALT||'',hash=process.env.REZIX_ADMIN_PASSWORD_HASH||'';
 if(!expected||!salt||!hash||email!==expected||!verifyPassword(password,salt,hash)){await recordAuthFailure('admin-login',email||'unknown',req);await audit({actorType:'admin',actorId:email||null,action:'auth.login.failed',req,metadata:{scope:'admin'}}).catch(()=>{});return NextResponse.redirect(new URL('/admin/login?error=1',req.url),303)}
 await clearAuthFailures('admin-login',email,req);return startPrivilegedLogin(req,{role:'admin',sub:expected,name:'Admin'});
}
