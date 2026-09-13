import { database } from './db';
import { id } from './store';
import type { Session } from './auth';
export async function updateSalon(session:Session,businessId:string,action:string,name:string,plan:string){
 return database().begin(async tx=>{
  const rows=await tx`select * from businesses where id=${businessId} for update`;const business=rows[0];if(!business)throw new Error('not-found');
  if(action==='edit'){if(!name||name.length>120)throw new Error('invalid');await tx`update businesses set name=${name} where id=${businessId}`;}
  else if(action==='activate'||action==='suspend'||action==='archive'){
   // Archiving does not cancel a subscription or delete data.
   await tx`update businesses set active=${action==='activate'},archived_at=${action==='archive'?new Date():null} where id=${businessId}`;
   if(action!=='activate'){
    await tx`update auth_sessions set revoked_at=now() where business_id=${businessId} and actor_type='friseur' and revoked_at is null`;
    await tx`update customer_sessions set revoked_at=now() where business_id=${businessId} and revoked_at is null`;
   }
  }else if(action==='plan'){
   if(!['starter','professional','business'].includes(plan))throw new Error('invalid');
   if(business.stripe_subscription_id&&!['canceled','incomplete_expired'].includes(business.subscription_status))throw new Error('managed-subscription');
   await tx`update businesses set billing_plan=${plan},subscription_status='active',billing_grace_until=null,billing_updated_at=now() where id=${businessId}`;
  }else throw new Error('invalid');
  await tx`insert into audit_logs(id,business_id,actor_type,actor_id,action,target_type,target_id,metadata) values(${id('aud')},${businessId},'admin',${session.sub},${'business.'+action},'business',${businessId},${tx.json({previousName:business.name,previousPlan:business.billing_plan,plan:action==='plan'?plan:null})})`;
 });
}
export async function salonManagers(businessId:string){return database()`select id,name,email,email_verified_at,active from staff_users where business_id=${businessId} and role='manager' order by created_at`}
