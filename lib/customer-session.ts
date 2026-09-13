import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { database } from './db';
export const CUSTOMER_SESSION_DAYS=180;
export function customerCookieName(businessId:string){return 'rezix_customer_'+crypto.createHash('sha256').update(businessId).digest('hex').slice(0,20)}
export const customerCookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:CUSTOMER_SESSION_DAYS*86400};
export function sessionDigest(value:string){return crypto.createHash('sha256').update(value).digest('hex')}
export async function customerSession(businessId:string){
 const value=(await cookies()).get(customerCookieName(businessId))?.value;
 if(!value||!/^[A-Za-z0-9_-]{43}$/.test(value))return null;
 const rows=await database()`select c.* from customer_sessions s join customers c on c.id=s.customer_id and c.business_id=s.business_id join businesses b on b.id=c.business_id where s.token_hash=${sessionDigest(value)} and s.business_id=${businessId} and s.revoked_at is null and s.expires_at>now() and c.active=true and b.active=true and b.archived_at is null limit 1`;
 return rows[0]??null;
}
