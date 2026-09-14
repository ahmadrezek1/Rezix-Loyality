import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { sameOrigin,consumeRateLimit,requestIp } from '@/lib/security';
import { getStaffByEmail } from '@/lib/store';
import { issueManagerCode } from '@/lib/manager-verification';
import { sendAuthEmail } from '@/lib/mailer';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const f=await req.formData();const email=String(f.get('email')||'').trim().toLowerCase();let challenge=crypto.randomBytes(24).toString('hex');let mailError=false;try{if(email.length<=160&&await consumeRateLimit('manager-code-ip',requestIp(req),10,15)&&await consumeRateLimit('manager-code-email',email,3,15)){const user=await getStaffByEmail(email);if(user?.role==='manager'&&!user.emailVerifiedAt){const issued=await issueManagerCode(user.id);challenge=issued.challengeId;mailError=!await sendAuthEmail({to:email,subject:'Rezix – Dein Bestätigungscode',html:`<h2>E-Mail bestätigen</h2><p>Dein Code: <b>${issued.code}</b></p><p>10 Minuten gültig. Gib ihn auf der Rezix-Webseite ein.</p>`});}}}catch{mailError=true;}return NextResponse.redirect(new URL('/manager/verify?challenge='+challenge+(mailError?'&mailError=1':''),req.url),303);}
