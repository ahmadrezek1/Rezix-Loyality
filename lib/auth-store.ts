import crypto from 'node:crypto';
import { database as db } from './db';
import type { Session } from './auth';
const h=(v:string)=>crypto.createHash('sha256').update(v).digest('hex');
const otpH=(v:string)=>crypto.createHmac('sha256',process.env.REZIX_SESSION_SECRET||'rezix-dev-only').update(v).digest('hex');
const id=(p:string)=>`${p}_${crypto.randomBytes(10).toString('hex')}`;
export async function registerSession(s:Session,req?:Request){const ip=req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req?.headers.get('x-real-ip')||null;await db()`insert into auth_sessions(jti,actor_type,actor_id,business_id,expires_at,ip_hash,user_agent) values (${s.jti},${s.role},${s.sub},${s.businessId??null},${new Date(s.exp)},${ip?h(ip):null},${req?.headers.get('user-agent')?.slice(0,500)||null}) on conflict(jti) do nothing`}
export async function isSessionActive(s:Session){
 const r=await db()`with valid as materialized (
  select a.jti,a.last_seen_at from auth_sessions a
  where a.jti=${s.jti} and a.actor_id=${s.sub} and a.actor_type=${s.role}
  and a.revoked_at is null and a.expires_at>now()
  and (${s.role}='admin' or exists(select 1 from staff_users u where u.id=${s.sub} and u.active=true and u.role=${s.role} and u.business_id=${s.businessId??null}))
 ), touched as (
  update auth_sessions a set last_seen_at=now() from valid v where a.jti=v.jti
  and (v.last_seen_at is null or v.last_seen_at<now()-interval '5 minutes')
 ) select jti from valid`;
 return !!r[0];
}
export async function revokeSession(jti:string){await db()`update auth_sessions set revoked_at=coalesce(revoked_at,now()) where jti=${jti}`}
export async function revokeActorSessions(actorType:'admin'|'manager'|'friseur',actorId:string){await db()`update auth_sessions set revoked_at=coalesce(revoked_at,now()) where actor_type=${actorType} and actor_id=${actorId} and revoked_at is null`}
export async function createOneTimeToken(actorId:string,actorType:'admin'|'manager'|'friseur',purpose:'email_verify'|'password_reset',minutes:number){const token=crypto.randomBytes(32).toString('base64url');const expiresAt=new Date(Date.now()+minutes*60_000);await db()`insert into auth_tokens(id,purpose,actor_id,actor_type,token_hash,expires_at) values (${id('tok')},${purpose},${actorId},${actorType},${h(token)},${expiresAt})`;return token}
export async function consumeOneTimeToken(token:string,purpose:'email_verify'|'password_reset'){const rows=await db()`update auth_tokens set consumed_at=now() where token_hash=${h(token)} and purpose=${purpose} and consumed_at is null and expires_at>now() returning actor_id,actor_type`;return rows[0] as {actor_id:string;actor_type:'admin'|'manager'|'friseur'}|undefined}
export async function createOtpChallenge(input:{businessId:string;email:string;name:string;privacyAck:boolean;marketing:boolean}){const code=String(crypto.randomInt(0,1_000_000)).padStart(6,'0');const challengeId=id('otp');await db()`insert into customer_otp_challenges(id,business_id,email,otp_hash,pending_name,privacy_ack,marketing_consent,expires_at) values (${challengeId},${input.businessId},${input.email.toLowerCase()},${otpH(code)},${input.name},${input.privacyAck},${input.marketing},now()+interval '10 minutes')`;return {challengeId,code}}
export async function otpSendAllowed(businessId:string,email:string){const r=await db()`select count(*)::int as count from customer_otp_challenges where business_id=${businessId} and lower(email)=lower(${email}) and created_at>now()-interval '15 minutes'`;return (r[0]?.count??0)<5}
export async function listActorSessions(actorType:'admin'|'manager'|'friseur',actorId:string){return db()`select jti,created_at,last_seen_at,expires_at,user_agent from auth_sessions where actor_type=${actorType} and actor_id=${actorId} and revoked_at is null and expires_at>now() order by last_seen_at desc limit 20`}
export async function revokeOtherSessions(actorType:'admin'|'manager'|'friseur',actorId:string,currentJti:string){await db()`update auth_sessions set revoked_at=now() where actor_type=${actorType} and actor_id=${actorId} and jti<>${currentJti} and revoked_at is null`}
export async function canIssueAuthToken(actorId:string,purpose:'email_verify'|'password_reset',max=3){const r=await db()`select count(*)::int as count from auth_tokens where actor_id=${actorId} and purpose=${purpose} and created_at>now()-interval '15 minutes'`;return (r[0]?.count??0)<max}

export async function isAdminEmailVerified(email:string){
  const r=await db()`select email_verified_at from admin_auth_state where lower(email)=lower(${email}) limit 1`;
  return !!r[0]?.email_verified_at;
}
export async function issueAdminEmailVerification(email:string){
  const token=crypto.randomBytes(32).toString('base64url');
  await db()`insert into admin_auth_state(email,verify_token_hash,verify_token_expires_at,updated_at)
    values (${email.toLowerCase()},${h(token)},now()+interval '24 hours',now())
    on conflict(email) do update set verify_token_hash=excluded.verify_token_hash,verify_token_expires_at=excluded.verify_token_expires_at,updated_at=now()`;
  return token;
}
export async function consumeAdminEmailVerification(token:string){
  const rows=await db()`update admin_auth_state set email_verified_at=coalesce(email_verified_at,now()),verify_token_hash=null,verify_token_expires_at=null,updated_at=now()
    where verify_token_hash=${h(token)} and verify_token_expires_at>now()
    returning email`;
  return rows[0]?.email as string|undefined;
}

export async function adminPassword(email:string){const rows=await db()`select password_salt,password_hash from admin_auth_state where lower(email)=lower(${email})`;return rows[0]??null}
