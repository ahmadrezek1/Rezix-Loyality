import { NextResponse } from 'next/server';
import { sameOrigin,consumeRateLimit,requestIp } from '@/lib/security';
import { verifyManagerCode } from '@/lib/manager-verification';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const f=await req.formData();const challenge=String(f.get('challenge')||'');const code=String(f.get('code')||'');let ok=false;try{if(await consumeRateLimit('manager-verify-ip',requestIp(req),30,15))ok=await verifyManagerCode(challenge,code);}catch{}return NextResponse.redirect(new URL(ok?'/manager/login?verified=1':'/manager/verify?error=1&challenge='+encodeURIComponent(challenge.slice(0,48)),req.url),303);}
