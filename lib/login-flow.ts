import { NextResponse } from 'next/server';
import { createSessionToken,SESSION_COOKIE,SESSION_COOKIE_OPTIONS } from './auth';
import { registerSession } from './auth-store';
export async function startPrivilegedLogin(req:Request,input:{role:'admin'|'manager';sub:string;name?:string;businessId?:string}){
  return completeSession(req,input,input.role==='admin'?'/admin':'/manager');
}
export async function completeSession(req:Request,input:{role:'admin'|'manager'|'friseur';sub:string;name?:string;businessId?:string},target:string){
  const {token,session}=createSessionToken(input);
  await registerSession(session,req);
  const res=NextResponse.redirect(new URL(target,req.url),303);
  res.cookies.set(SESSION_COOKIE,token,SESSION_COOKIE_OPTIONS);
  return res;
}
