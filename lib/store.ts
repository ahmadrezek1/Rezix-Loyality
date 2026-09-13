import { billingOperational,friseurLimitFor } from './billing';
import crypto from 'node:crypto';
import postgres from 'postgres';

export type Business = { id:string; slug:string; name:string; rewardTarget:number; rewardText:string; logoUrl:string|null; stampUrl:string|null; cardTitle:string; cardSubtitle:string; primaryColor:string; stampShape:'circle'|'rounded'|'square'; active:boolean; archivedAt:string|null; createdAt:string; billingPlan:'trial'|'starter'|'professional'|'business'; subscriptionStatus:string; trialStartedAt:string|null; trialEndsAt:string|null; stripeCustomerId:string|null; stripeSubscriptionId:string|null; stripePriceId:string|null; subscriptionCurrentPeriodEnd:string|null; cancelAtPeriodEnd:boolean; billingGraceUntil:string|null; billingUpdatedAt:string|null };
export type StaffUser = { id:string; businessId:string; name:string; email:string; passwordSalt:string; passwordHash:string; role:'manager'|'friseur'; active:boolean; createdAt:string; emailVerifiedAt:string|null };
export type Customer = { id:string; businessId:string; code:string; token:string; name:string; email:string|null; phone:string|null; stamps:number; rewardsRedeemed:number; createdAt:string; lastVisitAt:string|null; active:boolean; privacyNoticeAckAt:string|null; marketingConsent:boolean; marketingConsentAt:string|null; anonymizedAt:string|null };
export type PrivacyRequest={id:string;businessId:string;customerId:string;customerName:string;customerEmail:string|null;requestType:'access'|'erasure';status:'pending'|'completed'|'rejected';requestedAt:string;resolvedAt:string|null;resolutionNote:string|null};

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
export function hashPassword(password:string, salt=crypto.randomBytes(16).toString('hex')){ const out=crypto.scryptSync(password,Buffer.from(salt,'hex'),32,{N:16384,r:8,p:1,maxmem:64*1024*1024}); return {salt,hash:'scrypt$'+out.toString('hex')}; }
export function verifyPassword(password:string,salt:string,hash:string){ try{if(hash.startsWith('scrypt$')){const expected=Buffer.from(hash.slice(7),'hex');const actual=crypto.scryptSync(password,Buffer.from(salt,'hex'),expected.length,{N:16384,r:8,p:1,maxmem:64*1024*1024});return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected)}const actual=crypto.pbkdf2Sync(password,Buffer.from(salt,'hex'),210000,32,'sha256');const expected=Buffer.from(hash,'hex');return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected)}catch{return false} }
export function normalizeSlug(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9äöüß-]+/g,'-').replace(/[ä]/g,'ae').replace(/[ö]/g,'oe').replace(/[ü]/g,'ue').replace(/[ß]/g,'ss').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60)}
function mapBusiness(r:any):Business{return {id:r.id,slug:r.slug,name:r.name,rewardTarget:r.reward_target,rewardText:r.reward_text,logoUrl:r.logo_url||null,stampUrl:r.stamp_url||null,cardTitle:r.card_title||'Deine Treuekarte',cardSubtitle:r.card_subtitle||'Deine digitale Treuekarte',primaryColor:r.primary_color||'#2563EB',stampShape:(r.stamp_shape||'circle'),active:r.active&&!r.archived_at,archivedAt:r.archived_at?iso(r.archived_at):null,createdAt:iso(r.created_at),billingPlan:(r.billing_plan||'trial'),subscriptionStatus:r.subscription_status||'trialing',trialStartedAt:r.trial_started_at?iso(r.trial_started_at):null,trialEndsAt:r.trial_ends_at?iso(r.trial_ends_at):null,stripeCustomerId:r.stripe_customer_id||null,stripeSubscriptionId:r.stripe_subscription_id||null,stripePriceId:r.stripe_price_id||null,subscriptionCurrentPeriodEnd:r.subscription_current_period_end?iso(r.subscription_current_period_end):null,cancelAtPeriodEnd:!!r.cancel_at_period_end,billingGraceUntil:r.billing_grace_until?iso(r.billing_grace_until):null,billingUpdatedAt:r.billing_updated_at?iso(r.billing_updated_at):null}}
function mapStaff(r:any):StaffUser{return {id:r.id,businessId:r.business_id,name:r.name,email:r.email,passwordSalt:r.password_salt,passwordHash:r.password_hash,role:r.role,active:r.active,createdAt:iso(r.created_at),emailVerifiedAt:r.email_verified_at?iso(r.email_verified_at):null}}
function mapCustomer(r:any):Customer{ return {id:r.id,businessId:r.business_id,code:r.code,token:r.token,name:r.name,email:r.email||null,phone:r.phone||null,stamps:r.stamps,rewardsRedeemed:r.rewards_redeemed,createdAt:iso(r.created_at),lastVisitAt:r.last_visit_at?iso(r.last_visit_at):null,active:r.active!==false,privacyNoticeAckAt:r.privacy_notice_ack_at?iso(r.privacy_notice_ack_at):null,marketingConsent:!!r.marketing_consent,marketingConsentAt:r.marketing_consent_at?iso(r.marketing_consent_at):null,anonymizedAt:r.anonymized_at?iso(r.anonymized_at):null}; }

export async function listBusinesses():Promise<(Business & {managerEmail:string|null})[]>{const rows=await db()`select b.*,(select email from staff_users where business_id=b.id and role='manager' order by created_at limit 1) as manager_email from businesses b where not (b.id='main' and slug='main') order by created_at desc`;return rows.map(r=>({...mapBusiness(r),managerEmail:r.manager_email||null}))}
export async function getBusinessById(businessId:string):Promise<Business|null>{const rows=await db()`select * from businesses where id=${businessId} limit 1`;return rows[0]?mapBusiness(rows[0]):null}
export async function getBusinessBySlug(slug:string):Promise<Business|null>{const rows=await db()`select * from businesses where slug=${slug} and active=true and archived_at is null limit 1`;return rows[0]?mapBusiness(rows[0]):null}
export async function businessSlugExists(slug:string){const rows=await db()`select 1 from businesses where slug=${slug} limit 1`;return rows.length>0}
export async function createBusinessWithManager(input:{name:string;slug:string;rewardTarget:number;rewardText:string;logoUrl?:string|null;stampUrl?:string|null;managerName:string;managerEmail:string;managerPassword:string}){
  const businessId=id('biz'); const managerId=id('usr'); const p=hashPassword(input.managerPassword);
  return db().begin(async(tx:any)=>{
    await tx`insert into businesses (id,slug,name,reward_target,reward_text,logo_url,stamp_url,billing_plan,subscription_status,trial_started_at,trial_ends_at) values (${businessId},${input.slug},${input.name},${input.rewardTarget},${input.rewardText},${input.logoUrl||null},${input.stampUrl||null},'trial','trialing',now(),now()+interval '3 days')`;
    await tx`insert into staff_users (id,business_id,name,email,password_salt,password_hash,role) values (${managerId},${businessId},${input.managerName},${input.managerEmail},${p.salt},${p.hash},'manager')`;
    return {businessId,managerId};
  });
}
export async function updateBusinessAssets(businessId:string, logoUrl:string|null, stampUrl:string|null){await db()`update businesses set logo_url=coalesce(${logoUrl},logo_url),stamp_url=coalesce(${stampUrl},stamp_url) where id=${businessId}`}
export async function updateBusinessCardConfig(input:{businessId:string;rewardTarget:number;rewardText:string;cardTitle:string;cardSubtitle:string;primaryColor:string;stampShape:'circle'|'rounded'|'square';logoUrl?:string|null;stampUrl?:string|null}){await db()`update businesses set reward_target=${input.rewardTarget},reward_text=${input.rewardText},card_title=${input.cardTitle},card_subtitle=${input.cardSubtitle},primary_color=${input.primaryColor},stamp_shape=${input.stampShape},logo_url=coalesce(${input.logoUrl??null},logo_url),stamp_url=coalesce(${input.stampUrl??null},stamp_url) where id=${input.businessId}`}
export async function getStaffByEmail(email:string):Promise<StaffUser|null>{ const rows=await db()`select * from staff_users where email=${email} and active=true limit 1`; return rows[0]?mapStaff(rows[0]):null; }
export async function staffEmailExists(email:string){ const rows=await db()`select 1 from staff_users where email=${email} limit 1`; return rows.length>0; }
export async function createStaff(input:{businessId:string;name:string;email:string;password:string;role:'friseur'}){
 const p=hashPassword(input.password),staffId=id('usr');
 return db().begin(async(tx:any)=>{
  const rows=await tx`select * from businesses where id=${input.businessId} for update`;
  if(!rows[0])throw new Error('Salon nicht gefunden');const business=mapBusiness(rows[0]);
  const count=await tx`select count(*)::int as count from staff_users where business_id=${input.businessId} and role='friseur' and active=true`;
  if(!billingOperational(business)||count[0].count>=friseurLimitFor(business.billingPlan,business.subscriptionStatus))throw new Error('Tariflimit erreicht');
  await tx`insert into staff_users(id,business_id,name,email,password_salt,password_hash,role,email_verified_at) values(${staffId},${input.businessId},${input.name},${input.email},${p.salt},${p.hash},'friseur',null)`;
  return staffId;
 });
}


export async function getStaffById(idValue:string):Promise<StaffUser|null>{const rows=await db()`select * from staff_users where id=${idValue} and active=true limit 1`;return rows[0]?mapStaff(rows[0]):null}
export async function markStaffEmailVerified(staffId:string){await db()`update staff_users set email_verified_at=coalesce(email_verified_at,now()) where id=${staffId}`}
export async function updateStaffPassword(staffId:string,password:string){const p=hashPassword(password);await db()`update staff_users set password_salt=${p.salt},password_hash=${p.hash},password_changed_at=now() where id=${staffId}`}
export async function getCustomerByEmail(businessId:string,email:string):Promise<Customer|null>{ const rows=await db()`select * from customers where business_id=${businessId} and lower(email)=lower(${email}) limit 1`; return rows[0]?mapCustomer(rows[0]):null; }
export async function createCustomer(input:{businessId:string;name:string;email:string;marketingConsent?:boolean}):Promise<Customer>{ const c={id:id('cus'),code:customerCode(),token:customerToken(),name:input.name,email:input.email.toLowerCase()}; const marketing=!!input.marketingConsent; const rows=await db()`insert into customers (id,business_id,code,token,name,email,phone,privacy_notice_ack_at,marketing_consent,marketing_consent_at) values (${c.id},${input.businessId},${c.code},${c.token},${c.name},${c.email},null,now(),${marketing},${marketing?new Date():null}) returning *`; return mapCustomer(rows[0]); }
export async function getDashboardData(businessId:string,page=1){
  const [business,customers,staffCount,visitCount,visitsToday,totalCustomers,activeCustomers,visitsMonth,rewards,staff]=await Promise.all([
    getBusinessById(businessId),
    db()`select * from customers where business_id=${businessId} and active=true order by created_at desc,id desc limit 25 offset ${(page-1)*25}`,
    db()`select count(*)::int as count from staff_users where business_id=${businessId} and role = 'friseur' and active=true`,
    db()`select count(*)::int as count from visits where business_id=${businessId}`,
    db()`select count(*)::int as count from visits where business_id=${businessId} and type='stamp' and created_at >= date_trunc('day', now())`,
    db()`select count(*)::int as count from customers where business_id=${businessId} and active=true`,
    db()`select count(*)::int as count from customers where business_id=${businessId} and active=true and last_visit_at>=now()-interval '30 days'`,
    db()`select count(*)::int as count from visits where business_id=${businessId} and type='stamp' and created_at>=date_trunc('month',now())`,
    db()`select coalesce(sum(rewards_redeemed),0)::int as count from customers where business_id=${businessId}`,
    db()`select id,name,email,active,email_verified_at from staff_users where business_id=${businessId} and role='friseur' order by created_at desc`
  ]);
  return {activeCustomers:activeCustomers[0]?.count??0,visitsMonth:visitsMonth[0]?.count??0,rewards:rewards[0]?.count??0,staff,business,customers:customers.map(mapCustomer),staffCount:staffCount[0]?.count??0,visitCount:visitCount[0]?.count??0,visitsToday:visitsToday[0]?.count??0,totalCustomers:totalCustomers[0]?.count??0};
}
export async function getCustomerByCodeForBusiness(code:string,businessId:string):Promise<Customer|null>{
  const rows=await db()`select * from customers where code=${code} and business_id=${businessId} and active=true limit 1`;
  return rows[0]?mapCustomer(rows[0]):null;
}

export async function loyaltyOperation(code:string,staffId:string,businessId:string,requestId:string,operation:'stamp'|'redeem'){
 return db().begin(async(tx:any)=>{
  const rows=await tx`select * from businesses where id=${businessId} for update`;
  if(!rows[0]||!billingOperational(mapBusiness(rows[0])))return {kind:'blocked' as const};
  const staff=await tx`select 1 from staff_users where id=${staffId} and business_id=${businessId} and role='friseur' and active=true for share`;
  if(!staff.length)return {kind:'blocked' as const};
  const previous=await tx`select * from loyalty_operations where business_id=${businessId} and request_id=${requestId}`;
  if(previous.length){const p=previous[0];if(p.staff_id!==staffId||p.customer_code!==code||p.operation!==operation)return {kind:'conflict' as const};return {kind:'ok' as const,response:p.response};}
  const customers=await tx`select * from customers where code=${code} and business_id=${businessId} and active=true for update`;
  const c=customers[0],b=rows[0];if(!c)return {kind:'not-found' as const};
  if(operation==='stamp'&&c.stamps>=b.reward_target||operation==='redeem'&&c.stamps<b.reward_target)return {kind:'not-ready' as const};
  const updated=await tx`update customers set stamps=${operation==='stamp'?c.stamps+1:0},rewards_redeemed=rewards_redeemed+${operation==='redeem'?1:0},last_visit_at=now() where id=${c.id} returning *`;
  const next=updated[0];const response={customer:{name:next.name,code:next.code,stamps:next.stamps,rewardsRedeemed:next.rewards_redeemed},target:b.reward_target,rewardText:b.reward_text,rewardReady:next.stamps>=b.reward_target};
  await tx`insert into visits(id,business_id,customer_id,staff_id,type) values(${id('vis')},${businessId},${c.id},${staffId},${operation})`;
  await tx`insert into loyalty_operations(business_id,request_id,staff_id,customer_code,operation,response) values(${businessId},${requestId},${staffId},${code},${operation},${tx.json(response)})`;
  await tx`insert into audit_logs(id,business_id,actor_type,actor_id,action,target_type,target_id) values(${id('aud')},${businessId},'friseur',${staffId},${operation==='stamp'?'stamp.added':'reward.redeemed'},'kunde',${c.id})`;
  return {kind:'ok' as const,response};
 });
}

export async function addConsentRecord(input:{businessId:string;customerId:string;type:'privacy_notice'|'marketing';granted:boolean;policyVersion:string;ipHash?:string|null;userAgent?:string|null}){
  await db()`insert into consent_records (id,business_id,customer_id,consent_type,granted,policy_version,ip_hash,user_agent) values (${id('con')},${input.businessId},${input.customerId},${input.type},${input.granted},${input.policyVersion},${input.ipHash??null},${input.userAgent?.slice(0,500)??null})`;
}
export async function getCustomerExport(customerId:string,businessId:string){
  const [customer,business,visits,consents,requests]=await Promise.all([
    db()`select id,name,email,phone,code,stamps,rewards_redeemed,created_at,last_visit_at,marketing_consent,marketing_consent_at,privacy_notice_ack_at from customers where id=${customerId} and business_id=${businessId} limit 1`,
    db()`select id,slug,name,reward_target,reward_text from businesses where id=${businessId} limit 1`,
    db()`select type,created_at from visits where customer_id=${customerId} and business_id=${businessId} order by created_at asc`,
    db()`select consent_type,granted,policy_version,created_at from consent_records where customer_id=${customerId} and business_id=${businessId} order by created_at asc`,
    db()`select request_type,status,requested_at,resolved_at,resolution_note from privacy_requests where customer_id=${customerId} and business_id=${businessId} order by requested_at asc`
  ]);
  if(!customer[0]||!business[0]) return null;
  return {exportedAt:new Date().toISOString(),customer:customer[0],salon:business[0],visits,consents,privacyRequests:requests};
}
export async function createPrivacyRequest(customerId:string,businessId:string,requestType:'access'|'erasure'){
  const open=await db()`select id from privacy_requests where customer_id=${customerId} and business_id=${businessId} and request_type=${requestType} and status='pending' limit 1`;
  if(open[0]) return open[0].id as string;
  const requestId=id('prv');
  await db()`insert into privacy_requests (id,business_id,customer_id,request_type) values (${requestId},${businessId},${customerId},${requestType})`;
  return requestId;
}
export async function listPrivacyRequests(businessId:string):Promise<PrivacyRequest[]>{
  const rows=await db()`select p.id,p.business_id,p.customer_id,p.request_type,p.status,p.requested_at,p.resolved_at,p.resolution_note,c.name as customer_name,c.email as customer_email from privacy_requests p join customers c on c.id=p.customer_id and c.business_id=p.business_id where p.business_id=${businessId} order by case when p.status='pending' then 0 else 1 end,p.requested_at desc limit 100`;
  return rows.map((r:any)=>({id:r.id,businessId:r.business_id,customerId:r.customer_id,customerName:r.customer_name,customerEmail:r.customer_email,requestType:r.request_type,status:r.status,requestedAt:iso(r.requested_at),resolvedAt:r.resolved_at?iso(r.resolved_at):null,resolutionNote:r.resolution_note||null}));
}
export async function resolvePrivacyRequest(input:{requestId:string;businessId:string;managerId:string;decision:'completed'|'rejected';note?:string}){
  return db().begin(async(tx:any)=>{
    const reqs=await tx`select * from privacy_requests where id=${input.requestId} and business_id=${input.businessId} and status='pending' for update`;
    if(!reqs[0]) return {kind:'not-found' as const};
    const r=reqs[0];
    if(input.decision==='completed' && r.request_type==='erasure'){
      const anonEmail=`deleted-${crypto.randomBytes(10).toString('hex')}@invalid.local`; const anonPhone=`deleted-${crypto.randomBytes(10).toString('hex')}`;
      const anonToken=customerToken();
      await tx`update customer_sessions set revoked_at=now() where customer_id=${r.customer_id} and business_id=${input.businessId} and revoked_at is null`;
      await tx`update customers set name='Gelöschter Kunde',email=${anonEmail},phone=${anonPhone},token=${anonToken},active=false,marketing_consent=false,marketing_consent_at=null,anonymized_at=now() where id=${r.customer_id} and business_id=${input.businessId}`;
    }
    await tx`update privacy_requests set status=${input.decision},resolved_at=now(),resolved_by=${input.managerId},resolution_note=${input.note?.slice(0,500)||null} where id=${input.requestId} and business_id=${input.businessId}`;
    return {kind:'ok' as const,customerId:r.customer_id as string,requestType:r.request_type as 'access'|'erasure'};
  });
}

export async function updateMarketingConsent(customerId:string,businessId:string,granted:boolean){
  const rows=await db()`update customers set marketing_consent=${granted},marketing_consent_at=${granted?new Date():null} where id=${customerId} and business_id=${businessId} and active=true returning *`;
  return rows[0]?mapCustomer(rows[0]):null;
}
