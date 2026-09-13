import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isSessionActive } from './auth-store';
export type Role='admin'|'manager'|'friseur'|'kunde';
export type Session={role:Role;sub:string;name?:string;businessId?:string;iat:number;exp:number;jti:string};
const cookieName='rezix_session';
const pendingName='rezix_auth_pending';
function secret(){const s=process.env.REZIX_SESSION_SECRET;if(!s||s.length<32)throw new Error('REZIX_SESSION_SECRET fehlt oder ist zu kurz');return s}
function sign(payload:string){return crypto.createHmac('sha256',secret()).update(payload).digest('base64url')}
export function createSessionToken(data:Omit<Session,'iat'|'exp'|'jti'>,hours=8){const now=Date.now();const session:Session={...data,iat:now,exp:now+hours*3600_000,jti:crypto.randomBytes(18).toString('base64url')};const payload=Buffer.from(JSON.stringify(session)).toString('base64url');return {token:`${payload}.${sign(payload)}`,session}}
export function verifySessionToken(token?:string|null):Session|null{if(!token)return null;const [payload,sig]=token.split('.');if(!payload||!sig)return null;const expected=sign(payload);try{if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const s=JSON.parse(Buffer.from(payload,'base64url').toString()) as Session;return s.exp>Date.now()&&s.iat<=Date.now()+60_000?s:null}catch{return null}}
export async function currentSession(){const c=await cookies();const s=verifySessionToken(c.get(cookieName)?.value);if(!s)return null;return await isSessionActive(s)?s:null}
export async function requireAdmin(){const s=await currentSession();if(!s||s.role!=='admin')redirect('/admin/login');return s}
export async function requireManager(){const s=await currentSession();if(!s||s.role!=='manager'||!s.businessId)redirect('/manager/login');return s}
export async function requireFriseur(){const s=await currentSession();if(!s||s.role!=='friseur'||!s.businessId)redirect('/friseur/login');return s}
export function createPendingAuth(data:{role:'admin'|'manager';sub:string;name?:string;businessId?:string},minutes=10){const exp=Date.now()+minutes*60_000;const payload=Buffer.from(JSON.stringify({...data,exp,nonce:crypto.randomBytes(16).toString('hex')})).toString('base64url');return `${payload}.${sign(payload)}`}
export function verifyPendingAuth(token?:string|null){if(!token)return null;const [p,s]=token.split('.');if(!p||!s||sign(p)!==s)return null;try{const d=JSON.parse(Buffer.from(p,'base64url').toString());return d.exp>Date.now()?d as {role:'admin'|'manager';sub:string;name?:string;businessId?:string;exp:number}:null}catch{return null}}
export async function currentPendingAuth(){const c=await cookies();return verifyPendingAuth(c.get(pendingName)?.value)}
export const SESSION_COOKIE=cookieName;
export const PENDING_AUTH_COOKIE=pendingName;
export const SESSION_COOKIE_OPTIONS={httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:8*60*60};
export const PENDING_COOKIE_OPTIONS={httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:10*60};
