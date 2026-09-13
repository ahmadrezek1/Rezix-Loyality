import { NextResponse } from 'next/server';
import { createSessionToken,SESSION_COOKIE } from '@/lib/auth';
import { getStaffByEmail,verifyPassword } from '@/lib/store';
export async function POST(req:Request){
  const form=await req.formData(); const email=String(form.get('email')||'').trim().toLowerCase(); const password=String(form.get('password')||'');
  const u=await getStaffByEmail(email);
  if(!u||!verifyPassword(password,u.passwordSalt,u.passwordHash)) return NextResponse.redirect(new URL('/staff/login?error=1',req.url),303);
  const res=NextResponse.redirect(new URL('/staff',req.url),303);
  res.cookies.set(SESSION_COOKIE,createSessionToken({role:u.role,sub:u.id,name:u.name}),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:43200});
  return res;
}
