import { NextResponse } from 'next/server';
import { consumeAdminEmailVerification } from '@/lib/auth-store';
import { audit } from '@/lib/security';

export async function GET(req:Request){
  const token=new URL(req.url).searchParams.get('token')||'';
  const email=token?await consumeAdminEmailVerification(token):undefined;
  if(!email)return NextResponse.redirect(new URL('/admin/login?verifyError=1',req.url),303);
  await audit({actorType:'admin',actorId:email,action:'auth.email_verified',req}).catch(()=>{});
  return NextResponse.redirect(new URL('/admin/login?verified=1',req.url),303);
}
