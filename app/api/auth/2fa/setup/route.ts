import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentPendingAuth } from '@/lib/auth';
import { decryptSecret,enableMfa,getMfa } from '@/lib/auth-store';
import { verifyTotp } from '@/lib/totp';
import { completeSession } from '@/lib/login-flow';
import { audit,sameOrigin } from '@/lib/security';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const p=await currentPendingAuth();if(!p||!['admin','manager'].includes(p.role))return NextResponse.redirect(new URL('/',req.url),303);const f=await req.formData();const code=String(f.get('code')||'');const row=await getMfa(p.role,p.sub);if(!row||!verifyTotp(decryptSecret(row.secret_enc),code))return NextResponse.redirect(new URL('/auth/2fa/setup?error=1',req.url),303);const recovery=Array.from({length:8},()=>crypto.randomBytes(5).toString('hex').toUpperCase());await enableMfa(p.role,p.sub,recovery);await audit({actorType:p.role,actorId:p.sub,businessId:p.businessId||null,action:'auth.mfa.enabled',req});const res=await completeSession(req,{role:p.role,sub:p.sub,name:p.name,businessId:p.businessId},'/auth/2fa/recovery');const encoded=Buffer.from(JSON.stringify(recovery)).toString('base64url');res.cookies.set('rezix_recovery_codes',encoded,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/auth/2fa/recovery',maxAge:300});return res}
