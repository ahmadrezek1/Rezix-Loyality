import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type Session={role:'admin'|'staff'|'manager'; sub:string; name?:string; exp:number};
const cookieName='rezix_session';
function secret(){ const s=process.env.REZIX_SESSION_SECRET; if(!s) throw new Error('REZIX_SESSION_SECRET fehlt'); return s; }
function sign(payload:string){ return crypto.createHmac('sha256',secret()).update(payload).digest('base64url'); }
export function createSessionToken(data:Omit<Session,'exp'>, hours=12){ const session:Session={...data,exp:Date.now()+hours*3600_000}; const payload=Buffer.from(JSON.stringify(session)).toString('base64url'); return `${payload}.${sign(payload)}`; }
export function verifySessionToken(token?:string|null):Session|null{ if(!token) return null; const [payload,sig]=token.split('.'); if(!payload||!sig) return null; const expected=sign(payload); if(sig.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return null; try{ const s=JSON.parse(Buffer.from(payload,'base64url').toString()) as Session; return s.exp>Date.now()?s:null; }catch{return null;} }
export async function currentSession(){ const c=await cookies(); return verifySessionToken(c.get(cookieName)?.value); }
export async function requireAdmin(){ const s=await currentSession(); if(!s||s.role!=='admin') redirect('/admin/login'); return s; }
export async function requireStaff(){ const s=await currentSession(); if(!s||!['staff','manager'].includes(s.role)) redirect('/staff/login'); return s; }
export const SESSION_COOKIE=cookieName;
