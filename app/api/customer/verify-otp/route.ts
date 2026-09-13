import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { database } from '@/lib/db';
import { customerCookieName,customerCookieOptions,sessionDigest,CUSTOMER_SESSION_DAYS } from '@/lib/customer-session';
import { sameOrigin,hashPrivate,requestIp } from '@/lib/security';
import { POLICY_VERSION } from '@/lib/legal';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
 const body=await req.json().catch(()=>null);
 if(typeof body?.challengeId!=='string'||!/^otp_[a-f0-9]{20}$/.test(body.challengeId)||!/^\d{6}$/.test(body?.code||''))return NextResponse.json({error:'Ungültiger Code'},{status:400});
 const secret=process.env.REZIX_SESSION_SECRET;if(!secret)throw new Error('Session secret missing');
 const digest=crypto.createHmac('sha256',secret).update(body.code).digest('hex');
 const token=crypto.randomBytes(32).toString('base64url');
 const result=await database().begin(async tx=>{
  const rows=await tx`select * from customer_otp_challenges where id=${body.challengeId} for update`;
  const ch=rows[0];if(!ch||ch.consumed_at||new Date(ch.expires_at).getTime()<=Date.now()||ch.attempts>=5)return null;
  if(!crypto.timingSafeEqual(Buffer.from(ch.otp_hash),Buffer.from(digest))){await tx`update customer_otp_challenges set attempts=attempts+1 where id=${ch.id}`;return null;}
  const salons=await tx`select * from businesses where id=${ch.business_id} and active=true and archived_at is null for share`;
  if(!salons.length||!ch.privacy_ack)return null;
  // Serialize registration for the same salon/email, including separate OTP challenges.
  await tx`select pg_advisory_xact_lock(hashtextextended(${ch.business_id+'|'+ch.email.toLowerCase()},0))`;
  let customers=await tx`select id,active from customers where business_id=${ch.business_id} and lower(email)=lower(${ch.email})`;
  const created=!customers.length;
  if(created){
   const b=salons[0];const operational=b.subscription_status==='active'||b.subscription_status==='trialing'&&b.trial_ends_at&&new Date(b.trial_ends_at).getTime()>Date.now()||b.subscription_status==='past_due'&&b.billing_grace_until&&new Date(b.billing_grace_until).getTime()>Date.now();
   if(!operational)return null;
   customers=await tx`insert into customers(id,business_id,code,token,name,email,privacy_notice_ack_at,marketing_consent,marketing_consent_at) values(${ 'cus_'+crypto.randomBytes(12).toString('hex')},${ch.business_id},${'RZX-'+crypto.randomBytes(4).toString('hex').toUpperCase()},${crypto.randomBytes(24).toString('base64url')},${ch.pending_name},${ch.email},now(),${!!ch.marketing_consent},${ch.marketing_consent?new Date():null}) returning id,active`;
   for(const type of ch.marketing_consent?['privacy_notice','marketing']:['privacy_notice'])await tx`insert into consent_records(id,business_id,customer_id,consent_type,granted,policy_version,ip_hash,user_agent) values(${'con_'+crypto.randomBytes(12).toString('hex')},${ch.business_id},${customers[0].id},${type},true,${POLICY_VERSION},${hashPrivate(requestIp(req))},${req.headers.get('user-agent')?.slice(0,500)||null})`;
  }
  if(!customers[0].active)return null;
  await tx`insert into customer_sessions(token_hash,customer_id,business_id,expires_at) values(${sessionDigest(token)},${customers[0].id},${ch.business_id},${new Date(Date.now()+CUSTOMER_SESSION_DAYS*86400000)})`;
  await tx`update customer_otp_challenges set consumed_at=now() where id=${ch.id}`;
  await tx`insert into audit_logs(id,business_id,actor_type,actor_id,action) values(${'aud_'+crypto.randomBytes(12).toString('hex')},${ch.business_id},'kunde',${customers[0].id},${created?'kunde.registered':'auth.otp.verified'})`;
  return {businessId:ch.business_id};
 });
 if(!result)return NextResponse.json({error:'Der Code ist falsch oder abgelaufen. Bitte fordere einen neuen Code an.'},{status:401});
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 response.cookies.set(customerCookieName(result.businessId),token,customerCookieOptions);return response;
}
