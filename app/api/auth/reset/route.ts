import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { database } from '@/lib/db';
import { hashPassword,id } from '@/lib/store';
import { sameOrigin,consumeRateLimit,requestIp } from '@/lib/security';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 if(!await consumeRateLimit('reset-submit',requestIp(req),20,15))return NextResponse.json({error:'Bitte später erneut versuchen.'},{status:429});
 const f=await req.formData(),token=String(f.get('token')||''),password=String(f.get('password')||'');
 if(!token||password!==f.get('confirm')||password.length<12||password.length>256||!/[A-Za-zÄÖÜäöü]/.test(password)||!/[0-9]/.test(password))return NextResponse.redirect(new URL(`/auth/reset?token=${encodeURIComponent(token)}&error=1`,req.url),303);
 const p=await hashPassword(password),digest=crypto.createHash('sha256').update(token).digest('hex');
 const ok=await database().begin(async tx=>{
  const rows=await tx`select * from auth_tokens where token_hash=${digest} and purpose='password_reset' and consumed_at is null and expires_at>now() for update`;const t=rows[0];if(!t)return false;
  const updated=t.actor_type==='admin'?await tx`update admin_auth_state set password_salt=${p.salt},password_hash=${p.hash},updated_at=now() where email=${t.actor_id} returning email`:await tx`update staff_users set password_salt=${p.salt},password_hash=${p.hash},password_changed_at=now() where id=${t.actor_id} and role=${t.actor_type} and active=true returning id`;
  if(!updated.length)return false;
  await tx`update auth_tokens set consumed_at=now() where actor_id=${t.actor_id} and actor_type=${t.actor_type} and purpose='password_reset' and consumed_at is null`;
  await tx`update auth_sessions set revoked_at=now() where actor_id=${t.actor_id} and actor_type=${t.actor_type} and revoked_at is null`;
  await tx`insert into audit_logs(id,actor_type,actor_id,action) values(${id('aud')},${t.actor_type},${t.actor_id},'auth.password_reset.completed')`;
  return true;
 });
 return NextResponse.redirect(new URL(ok?'/auth/reset?done=1':'/auth/reset?error=1',req.url),303);
}
