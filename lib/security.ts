import crypto from 'node:crypto';
import postgres from 'postgres';
import type { Session } from './auth';

let client: ReturnType<typeof postgres>|null=null;
function db(){const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL fehlt');if(!client)client=postgres(url,{ssl:'require',max:3,idle_timeout:20,connect_timeout:10,prepare:false});return client}
const rid=(p:string)=>`${p}_${crypto.randomBytes(10).toString('hex')}`;
export function requestIp(req:Request){const h=req.headers;return (h.get('x-forwarded-for')?.split(',')[0]||h.get('x-real-ip')||'unknown').trim()}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)return true;try{return new URL(origin).origin===new URL(req.url).origin}catch{return false}}
export function hashPrivate(value:string){const secret=process.env.REZIX_SESSION_SECRET||'rezix';return crypto.createHmac('sha256',secret).update(value).digest('hex')}
export async function audit(input:{session?:Session|null;actorType?:'admin'|'manager'|'friseur'|'kunde'|'system';actorId?:string|null;businessId?:string|null;action:string;targetType?:string|null;targetId?:string|null;req?:Request;metadata?:Record<string,unknown>}){
 const s=input.session; const ua=input.req?.headers.get('user-agent')?.slice(0,500)||null; const ip=input.req?hashPrivate(requestIp(input.req)):null;
 await db()`insert into audit_logs (id,business_id,actor_type,actor_id,action,target_type,target_id,ip_hash,user_agent,metadata) values (${rid('aud')},${input.businessId??s?.businessId??null},${input.actorType??s?.role??'system'},${input.actorId??s?.sub??null},${input.action},${input.targetType??null},${input.targetId??null},${ip},${ua},${db().json((input.metadata??{}) as any)})`;
}
export async function recentAudit(businessId:string,limit=30){return db()`select actor_type,actor_id,action,target_type,target_id,metadata,created_at from audit_logs where business_id=${businessId} order by created_at desc limit ${limit}`}
export async function recentAdminAudit(limit=40){return db()`select business_id,actor_type,actor_id,action,target_type,target_id,metadata,created_at from audit_logs order by created_at desc limit ${limit}`}
export async function isBlocked(scope:string,identity:string,req:Request){const key=hashPrivate(`${scope}|${identity.toLowerCase()}|${requestIp(req)}`);const rows=await db()`select blocked_until from auth_rate_limits where key_hash=${key} limit 1`;return !!(rows[0]?.blocked_until && new Date(rows[0].blocked_until).getTime()>Date.now())}
export async function recordAuthFailure(scope:string,identity:string,req:Request){const key=hashPrivate(`${scope}|${identity.toLowerCase()}|${requestIp(req)}`);await db()`insert into auth_rate_limits(key_hash,scope,failures,blocked_until) values (${key},${scope},1,null) on conflict(key_hash) do update set failures=auth_rate_limits.failures+1, blocked_until=case when auth_rate_limits.failures+1>=5 then now()+interval '15 minutes' else auth_rate_limits.blocked_until end, updated_at=now()`}
export async function clearAuthFailures(scope:string,identity:string,req:Request){const key=hashPrivate(`${scope}|${identity.toLowerCase()}|${requestIp(req)}`);await db()`delete from auth_rate_limits where key_hash=${key}`}
