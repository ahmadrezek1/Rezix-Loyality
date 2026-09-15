import { sameOrigin,consumeRateLimit,requestIp } from '@/lib/security';
import { NextResponse } from 'next/server';
import { getStaffByEmail,verifyPassword } from '@/lib/store';
import { audit,clearAuthFailures,isBlocked,recordAuthFailure } from '@/lib/security';
import { completeSession } from '@/lib/login-flow';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 if(!await consumeRateLimit('login-ip',requestIp(req),30,15))return NextResponse.redirect(new URL('/friseur/login?blocked=1',req.url),303);
const form=await req.formData();const email=String(form.get('email')||'').trim().toLowerCase();const password=String(form.get('password')||'');if(await isBlocked('friseur-login',email||'unknown',req))return NextResponse.redirect(new URL('/friseur/login?blocked=1',req.url),303);const u=await getStaffByEmail(email);if(!u||u.role!=='friseur'||!await verifyPassword(password,u.passwordSalt,u.passwordHash)){await recordAuthFailure('friseur-login',email||'unknown',req);await audit({actorType:'friseur',actorId:u?.id||email||null,businessId:u?.businessId||null,action:'auth.login.failed',req,metadata:{scope:'friseur'}}).catch(()=>{});return NextResponse.redirect(new URL('/friseur/login?error=1',req.url),303)}if(!u.emailVerifiedAt)return NextResponse.redirect(new URL('/friseur/login?verify=1',req.url),303);await clearAuthFailures('friseur-login',email,req);const res=await completeSession(req,{role:'friseur',sub:u.id,name:u.name,businessId:u.businessId},'/friseur');await audit({actorType:'friseur',actorId:u.id,businessId:u.businessId,action:'auth.login.success',req}).catch(()=>{});return res}
