import crypto from 'node:crypto';
import { database } from './db';
function digest(id:string,code:string){const secret=process.env.REZIX_SESSION_SECRET;if(!secret)throw new Error('Session secret missing');return crypto.createHmac('sha256',secret).update(id+':'+code).digest('hex');}
export async function issueManagerCode(managerId:string){
 const challengeId=crypto.randomBytes(24).toString('hex');const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');const hash=digest(challengeId,code);
 await database().begin(async tx=>{await tx`select id from staff_users where id=${managerId} for update`;await tx`update manager_email_challenges set consumed_at=now() where manager_id=${managerId} and consumed_at is null`;await tx`insert into manager_email_challenges(id,manager_id,code_hash,expires_at) values(${challengeId},${managerId},${hash},now()+interval '10 minutes')`;});return {challengeId,code};
}
export async function verifyManagerCode(challengeId:string,code:string){
 if(!/^[a-f0-9]{48}$/.test(challengeId)||!/^\d{6}$/.test(code))return false;
 const hash=digest(challengeId,code);
 return database().begin(async tx=>{
  // Lock manager first to use the same ordering as code issuance.
  const owners=await tx`select manager_id from manager_email_challenges where id=${challengeId}`;if(!owners[0])return false;
  const users=await tx`select id,active,role from staff_users where id=${owners[0].manager_id} for update`;if(!users[0]?.active||users[0].role!=='manager')return false;
  const rows=await tx`select * from manager_email_challenges where id=${challengeId} for update`;const c=rows[0];
  if(!c||c.consumed_at||c.attempts>=5||new Date(c.expires_at).getTime()<=Date.now())return false;
  if(!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(c.code_hash))){await tx`update manager_email_challenges set attempts=attempts+1 where id=${challengeId}`;return false;}
  await tx`update staff_users set email_verified_at=coalesce(email_verified_at,now()) where id=${c.manager_id}`;
  await tx`update manager_email_challenges set consumed_at=now() where manager_id=${c.manager_id} and consumed_at is null`;return true;
 });
}
