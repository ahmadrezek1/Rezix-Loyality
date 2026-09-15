import { sameOrigin,consumeRateLimit,requestIp } from '@/lib/security';
import { NextResponse } from 'next/server';
import { getStaffByEmail,verifyPassword } from '@/lib/store';
import { audit,clearAuthFailures,isBlocked,recordAuthFailure } from '@/lib/security';
import { completeSession } from '@/lib/login-flow';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 if(!await consumeRateLimit('login-ip',requestIp(req),30,15))return NextResponse.redirect(new URL('/manager/login?blocked=1',req.url),303);

 const f=await req.formData();const email=String(f.get('email')||'').trim().toLowerCase();const password=String(f.get('password')||'');
 if(await isBlocked('manager-login',email||'unknown',req))return NextResponse.redirect(new URL('/manager/login?blocked=1',req.url),303);
 const u=await getStaffByEmail(email);
 if(!u||u.role!=='manager'||!verifyPassword(password,u.passwordSalt,u.passwordHash)){
   await recordAuthFailure('manager-login',email||'unknown',req);await audit({actorType:'manager',actorId:u?.id||email||null,businessId:u?.businessId||null,action:'auth.login.failed',req,metadata:{scope:'manager'}}).catch(()=>{});return NextResponse.redirect(new URL('/manager/login?error=1',req.url),303)
 }
 if(!u.emailVerifiedAt)return NextResponse.redirect(new URL('/manager/login?verify=1',req.url),303);
 await clearAuthFailures('manager-login',email,req);
 await audit({actorType:'manager',actorId:u.id,businessId:u.businessId,action:'auth.login.success',req,metadata:{method:'password'}}).catch(()=>{});
 return completeSession(req,{role:'manager',sub:u.id,name:u.name,businessId:u.businessId},'/manager');
}
