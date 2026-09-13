import { NextResponse } from 'next/server';
import { createPendingAuth,createSessionToken,PENDING_AUTH_COOKIE,PENDING_COOKIE_OPTIONS,SESSION_COOKIE,SESSION_COOKIE_OPTIONS } from './auth';
import { getMfa,registerSession } from './auth-store';
export async function startPrivilegedLogin(req:Request,input:{role:'admin'|'manager';sub:string;name?:string;businessId?:string}){
  const pending=createPendingAuth(input);
  const mfa=await getMfa(input.role,input.sub);
  const target=mfa?.enabled?'/auth/2fa/challenge':'/auth/2fa/setup';
  const res=NextResponse.redirect(new URL(target,req.url),303);
  res.cookies.set(PENDING_AUTH_COOKIE,pending,PENDING_COOKIE_OPTIONS);
  return res;
}
export async function completeSession(req:Request,input:{role:'admin'|'manager'|'friseur';sub:string;name?:string;businessId?:string},target:string){
  const {token,session}=createSessionToken(input);
  await registerSession(session,req);
  const res=NextResponse.redirect(new URL(target,req.url),303);
  res.cookies.set(SESSION_COOKIE,token,SESSION_COOKIE_OPTIONS);
  res.cookies.set(PENDING_AUTH_COOKIE,'',{...PENDING_COOKIE_OPTIONS,maxAge:0});
  return res;
}
