import crypto from 'node:crypto';
import postgres from 'postgres';

export type Business = { name:string; rewardTarget:number; rewardText:string; createdAt:string };
export type StaffUser = { id:string; name:string; email:string; passwordSalt:string; passwordHash:string; role:'staff'|'manager'; active:boolean; createdAt:string };
export type Customer = { id:string; code:string; token:string; name:string; phone:string; stamps:number; rewardsRedeemed:number; createdAt:string; lastVisitAt:string|null };
export type Visit = { id:string; customerId:string; staffId:string; createdAt:string; type:'stamp'|'redeem' };

let client: ReturnType<typeof postgres> | null = null;
function db(){
  const url=process.env.DATABASE_URL;
  if(!url) throw new Error('DATABASE_URL fehlt');
  if(!client) client=postgres(url,{ssl:'require',max:5,idle_timeout:20,connect_timeout:10,prepare:false});
  return client;
}
function iso(v:unknown){ return v instanceof Date?v.toISOString():String(v); }
export function id(prefix:string){ return `${prefix}_${crypto.randomBytes(8).toString('hex')}`; }
export function customerCode(){ return 'RZX-'+crypto.randomBytes(4).toString('hex').toUpperCase(); }
export function customerToken(){ return crypto.randomBytes(24).toString('base64url'); }
export function hashPassword(password:string, salt=crypto.randomBytes(16).toString('hex')){ return {salt,hash:crypto.pbkdf2Sync(password,Buffer.from(salt,'hex'),210000,32,'sha256').toString('hex')}; }
export function verifyPassword(password:string,salt:string,hash:string){ const actual=crypto.pbkdf2Sync(password,Buffer.from(salt,'hex'),210000,32,'sha256'); const expected=Buffer.from(hash,'hex'); return actual.length===expected.length && crypto.timingSafeEqual(actual,expected); }

export async function getBusiness():Promise<Business|null>{
  const rows=await db()`select name,reward_target,reward_text,created_at from businesses where id='main' limit 1`;
  if(!rows[0]) return null;
  const r=rows[0]; return {name:r.name,rewardTarget:r.reward_target,rewardText:r.reward_text,createdAt:iso(r.created_at)};
}
export async function saveBusiness(input:{name:string;rewardTarget:number;rewardText:string}){
  await db()`insert into businesses (id,name,reward_target,reward_text) values ('main',${input.name},${input.rewardTarget},${input.rewardText}) on conflict (id) do update set name=excluded.name,reward_target=excluded.reward_target,reward_text=excluded.reward_text`;
}
export async function getStaffByEmail(email:string):Promise<StaffUser|null>{
  const rows=await db()`select * from staff_users where email=${email} and active=true limit 1`; if(!rows[0]) return null; const r=rows[0];
  return {id:r.id,name:r.name,email:r.email,passwordSalt:r.password_salt,passwordHash:r.password_hash,role:r.role,active:r.active,createdAt:iso(r.created_at)};
}
export async function staffEmailExists(email:string){ const rows=await db()`select 1 from staff_users where email=${email} limit 1`; return rows.length>0; }
export async function createStaff(input:{name:string;email:string;password:string;role:'staff'|'manager'}){ const p=hashPassword(input.password); await db()`insert into staff_users (id,name,email,password_salt,password_hash,role) values (${id('usr')},${input.name},${input.email},${p.salt},${p.hash},${input.role})`; }
export async function getCustomerByToken(token:string):Promise<Customer|null>{ const rows=await db()`select * from customers where token=${token} limit 1`; return rows[0]?mapCustomer(rows[0]):null; }
export async function getCustomerByPhone(phone:string):Promise<Customer|null>{ const rows=await db()`select * from customers where phone=${phone} limit 1`; return rows[0]?mapCustomer(rows[0]):null; }
export async function createCustomer(input:{name:string;phone:string}):Promise<Customer>{
  const c={id:id('cus'),code:customerCode(),token:customerToken(),name:input.name,phone:input.phone};
  const rows=await db()`insert into customers (id,code,token,name,phone) values (${c.id},${c.code},${c.token},${c.name},${c.phone}) returning *`; return mapCustomer(rows[0]);
}
export async function getDashboardData(){
  const [business, customers, staffCount, visitCount, visitsToday]=await Promise.all([
    getBusiness(),
    db()`select * from customers order by created_at desc limit 8`,
    db()`select count(*)::int as count from staff_users`,
    db()`select count(*)::int as count from visits`,
    db()`select count(*)::int as count from visits where type='stamp' and created_at >= date_trunc('day', now())`
  ]);
  const totalCustomers=await db()`select count(*)::int as count from customers`;
  return {business,customers:customers.map(mapCustomer),staffCount:staffCount[0]?.count??0,visitCount:visitCount[0]?.count??0,visitsToday:visitsToday[0]?.count??0,totalCustomers:totalCustomers[0]?.count??0};
}
export async function addStampAtomic(code:string,staffId:string){
  return db().begin(async (tx:any)=>{
    const b=await tx`select reward_target from businesses where id='main' for update`; if(!b[0]) return {kind:'no-business' as const};
    const c=await tx`select * from customers where code=${code} for update`; if(!c[0]) return {kind:'not-found' as const};
    if(c[0].stamps>=b[0].reward_target) return {kind:'reward-ready' as const};
    const updated=await tx`update customers set stamps=stamps+1,last_visit_at=now() where id=${c[0].id} returning *`;
    await tx`insert into visits (id,customer_id,staff_id,type) values (${id('vis')},${c[0].id},${staffId},'stamp')`;
    return {kind:'ok' as const,customer:mapCustomer(updated[0]),target:b[0].reward_target as number};
  });
}
function mapCustomer(r:any):Customer{ return {id:r.id,code:r.code,token:r.token,name:r.name,phone:r.phone,stamps:r.stamps,rewardsRedeemed:r.rewards_redeemed,createdAt:iso(r.created_at),lastVisitAt:r.last_visit_at?iso(r.last_visit_at):null}; }
