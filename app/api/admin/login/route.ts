import { NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { verifyPassword } from '@/lib/store';
export async function POST(req:Request){
 const form=await req.formData(); const email=String(form.get('email')||'').trim().toLowerCase(); const password=String(form.get('password')||'');
 const expected=(process.env.REZIX_ADMIN_EMAIL||'').trim().toLowerCase(); const salt=process.env.REZIX_ADMIN_PASSWORD_SALT||''; const hash=process.env.REZIX_ADMIN_PASSWORD_HASH||'';
 if(!expected||!salt||!hash||email!==expected||!verifyPassword(password,salt,hash)) return NextResponse.redirect(new URL('/admin/login?error=1',req.url),303);
 const res=NextResponse.redirect(new URL('/owner',req.url),303); res.cookies.set(SESSION_COOKIE,createSessionToken({role:'admin',sub:expected,name:'Admin'}),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:43200}); return res;
}
