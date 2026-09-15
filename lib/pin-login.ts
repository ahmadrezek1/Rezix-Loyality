import crypto from 'node:crypto';
import { database } from './db';
export type PinRole='manager'|'friseur';
export const pinCookie=(role:PinRole)=>`rezix_trusted_${role}`;
export const pinCookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge:30*86400};
export const deviceDigest=(token:string)=>crypto.createHash('sha256').update(token).digest('hex');
function pepper(value:string){const secret=process.env.REZIX_SESSION_SECRET;if(!secret||secret.length<32)throw new Error('Session secret missing');return crypto.createHmac('sha256',secret).update(value).digest('hex');}
async function pinHash(pin:string,salt:string){const key=await new Promise<Buffer>((resolve,reject)=>crypto.scrypt(pepper(pin),salt,32,(error,value)=>error?reject(error):resolve(value)));return key.toString('hex');}
export async function enablePin(staff:{id:string;role:PinRole;passwordHash:string},pin:string,previous?:string){
 if(!/^\d{4}$/.test(pin))throw new Error('Invalid PIN');
 const token=crypto.randomBytes(32).toString('base64url');const salt=crypto.randomBytes(16).toString('hex');
 await database().begin(async tx=>{if(previous)await tx`update trusted_pin_devices set revoked_at=now() where token_hash=${deviceDigest(previous)} and staff_id=${staff.id}`;await tx`insert into trusted_pin_devices(token_hash,staff_id,role,pin_salt,pin_hash,credential_hash,expires_at) values(${deviceDigest(token)},${staff.id},${staff.role},${salt},${await pinHash(pin,salt)},${pepper(staff.passwordHash)},now()+interval '30 days')`;});return token;
}
export async function loginWithPin(token:string,role:PinRole,pin:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)||!/^\d{4}$/.test(pin))return null;
 return database().begin(async tx=>{
  const rows=await tx`select * from trusted_pin_devices where token_hash=${deviceDigest(token)} and role=${role} for update`;const d=rows[0];
  if(!d||d.revoked_at||d.attempts>=5||new Date(d.expires_at).getTime()<=Date.now())return null;
  const users=await tx`select s.id,s.name,s.business_id,s.password_hash from staff_users s join businesses b on b.id=s.business_id where s.id=${d.staff_id} and s.role=${role} and s.active=true and s.email_verified_at is not null and b.active=true and b.archived_at is null`;
  const u=users[0];if(!u||pepper(u.password_hash)!==d.credential_hash){await tx`update trusted_pin_devices set revoked_at=now() where token_hash=${d.token_hash}`;return null;}
  const hash=await pinHash(pin,d.pin_salt);if(!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(d.pin_hash))){await tx`update trusted_pin_devices set attempts=attempts+1,revoked_at=case when attempts>=4 then now() else revoked_at end where token_hash=${d.token_hash}`;return null;}
  await tx`update trusted_pin_devices set attempts=0,last_used_at=now() where token_hash=${d.token_hash}`;
  return {role,sub:u.id,name:u.name,businessId:u.business_id};
 });
}
export async function forgetPin(token:string){await database()`update trusted_pin_devices set revoked_at=now() where token_hash=${deviceDigest(token)}`;}
