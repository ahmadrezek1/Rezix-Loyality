import crypto from 'node:crypto';
import postgres from 'postgres';
import Stripe from 'stripe';
import type { Business } from './store';

export type BillingPlanKey='starter'|'professional'|'business';
export type BillingInterval='monthly'|'yearly';
export type PlanDefinition={key:BillingPlanKey;name:string;monthlyLabel:string;yearlyLabel:string;friseurLimit:number;features:string[]};

export const BILLING_PLANS:PlanDefinition[]=[
  {key:'starter',name:'Starter',monthlyLabel:'19 €',yearlyLabel:'190 €',friseurLimit:3,features:['1 Salon','Bis zu 3 Friseure','Digitale Kundenkarte','Loyalty & Rewards']},
  {key:'professional',name:'Professional',monthlyLabel:'39 €',yearlyLabel:'390 €',friseurLimit:10,features:['1 Salon','Bis zu 10 Friseure','Analytics','Custom Branding','Erweiterte Loyalty']},
  {key:'business',name:'Business',monthlyLabel:'79 €',yearlyLabel:'790 €',friseurLimit:50,features:['Bis zu 50 Friseure','Erweiterte Administration','Priorisierter Support','Für wachsende Betriebe']}
];

let client:ReturnType<typeof postgres>|null=null;
function db(){const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL fehlt');if(!client)client=postgres(url,{ssl:'require',max:3,idle_timeout:20,connect_timeout:10,prepare:false});return client}
let stripeClient:Stripe|null=null;
export function stripe(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('STRIPE_SECRET_KEY fehlt');if(!stripeClient)stripeClient=new Stripe(key);return stripeClient}

export function priceId(plan:BillingPlanKey,interval:BillingInterval){const key=`STRIPE_PRICE_${plan.toUpperCase()}_${interval==='monthly'?'MONTHLY':'YEARLY'}`;const value=process.env[key];if(!value)throw new Error(`${key} fehlt`);return value}
export function planFromPrice(price:string|null|undefined):BillingPlanKey|null{if(!price)return null;for(const p of BILLING_PLANS){if(price===process.env[`STRIPE_PRICE_${p.key.toUpperCase()}_MONTHLY`]||price===process.env[`STRIPE_PRICE_${p.key.toUpperCase()}_YEARLY`])return p.key}return null}
export function planDefinition(plan:string|null|undefined){return BILLING_PLANS.find(p=>p.key===plan)||null}
export function friseurLimitFor(plan:string,status?:string){if(status==='trialing'||plan==='trial')return 10;return planDefinition(plan)?.friseurLimit??0}

export function trialActive(b:Business){return b.subscriptionStatus==='trialing'&&!!b.trialEndsAt&&new Date(b.trialEndsAt).getTime()>Date.now()}
export function billingOperational(b:Business){if(!b.active)return false;if(b.subscriptionStatus==='active'||b.subscriptionStatus==='trialing')return b.subscriptionStatus!=='trialing'||trialActive(b);if(b.subscriptionStatus==='past_due'&&b.billingGraceUntil)return new Date(b.billingGraceUntil).getTime()>Date.now();return false}
export function billingStatusLabel(status:string){const m:Record<string,string>={trialing:'Testphase',trial_expired:'Testphase abgelaufen',active:'Aktiv',past_due:'Zahlung überfällig',canceled:'Gekündigt',unpaid:'Unbezahlt',incomplete:'Unvollständig',incomplete_expired:'Abgelaufen',paused:'Pausiert'};return m[status]||status}

export async function getBillingSummary(businessId:string){const rows=await db()`select billing_plan,subscription_status,trial_started_at,trial_ends_at,stripe_customer_id,stripe_subscription_id,stripe_price_id,subscription_current_period_end,cancel_at_period_end,billing_grace_until,billing_updated_at from businesses where id=${businessId} limit 1`;return rows[0]||null}
export async function countFriseurs(businessId:string){const r=await db()`select count(*)::int as count from staff_users where business_id=${businessId} and role='friseur' and active=true`;return r[0]?.count??0}
export async function assertCanCreateFriseur(business:Business){if(!billingOperational(business))return {ok:false as const,reason:'subscription' as const,limit:0,count:await countFriseurs(business.id)};const limit=friseurLimitFor(business.billingPlan,business.subscriptionStatus);const count=await countFriseurs(business.id);if(count>=limit)return {ok:false as const,reason:'limit' as const,limit,count};return {ok:true as const,limit,count}}

export async function ensureStripeCustomer(input:{business:Business;managerEmail:string;managerName:string}){
  if(input.business.stripeCustomerId)return input.business.stripeCustomerId;
  const customer=await stripe().customers.create({email:input.managerEmail,name:input.business.name,metadata:{rezix_business_id:input.business.id,rezix_manager_name:input.managerName}});
  await db()`update businesses set stripe_customer_id=${customer.id},billing_updated_at=now() where id=${input.business.id}`;
  return customer.id;
}

export async function setCheckoutPending(businessId:string,customerId:string){await db()`update businesses set stripe_customer_id=coalesce(stripe_customer_id,${customerId}),subscription_status=case when subscription_status='trialing' then subscription_status else 'incomplete' end,billing_updated_at=now() where id=${businessId}`}

export async function findBusinessByStripeCustomer(customerId:string){const r=await db()`select id from businesses where stripe_customer_id=${customerId} limit 1`;return r[0]?.id as string|undefined}
export async function findBusinessBySubscription(subscriptionId:string){const r=await db()`select id from businesses where stripe_subscription_id=${subscriptionId} limit 1`;return r[0]?.id as string|undefined}

function toDateFromUnix(v:number|null|undefined){return v?new Date(v*1000):null}
export async function syncSubscription(subscription:Stripe.Subscription,forcedBusinessId?:string){
  const customerId=typeof subscription.customer==='string'?subscription.customer:subscription.customer.id;
  const businessId=forcedBusinessId||subscription.metadata?.rezix_business_id||await findBusinessByStripeCustomer(customerId)||await findBusinessBySubscription(subscription.id);
  if(!businessId)throw new Error(`Kein Rezix Salon für Stripe Subscription ${subscription.id}`);
  const item=subscription.items.data[0];const price=item?.price?.id||null;const plan=planFromPrice(price)||'starter';
  const status=subscription.status==='canceled'?'canceled':subscription.status;
  const currentEnd=toDateFromUnix((subscription as any).current_period_end ?? item?.current_period_end);
  const grace=status==='past_due'?new Date(Date.now()+7*24*3600_000):null;
  await db()`update businesses set stripe_customer_id=${customerId},stripe_subscription_id=${subscription.id},stripe_price_id=${price},billing_plan=${plan},subscription_status=${status},subscription_current_period_end=${currentEnd},cancel_at_period_end=${subscription.cancel_at_period_end},billing_grace_until=${grace},billing_updated_at=now() where id=${businessId}`;
  return businessId;
}

export async function markInvoicePaid(invoice:Stripe.Invoice){const rawSub=(invoice as any).subscription??(invoice as any).parent?.subscription_details?.subscription;const sub=typeof rawSub==='string'?rawSub:(rawSub&&typeof rawSub.id==='string'?rawSub.id:null);const customer=typeof invoice.customer==='string'?invoice.customer:null;const businessId=(sub?await findBusinessBySubscription(sub):undefined)||(customer?await findBusinessByStripeCustomer(customer):undefined);if(!businessId)return null;await db()`update businesses set billing_grace_until=null,billing_updated_at=now() where id=${businessId}`;await addBillingHistory({businessId,eventType:'invoice.paid',amountTotal:invoice.amount_paid,currency:invoice.currency,metadata:{invoiceId:invoice.id}});return businessId}
export async function markInvoicePaymentFailed(invoice:Stripe.Invoice){const rawSub=(invoice as any).subscription??(invoice as any).parent?.subscription_details?.subscription;const sub=typeof rawSub==='string'?rawSub:(rawSub&&typeof rawSub.id==='string'?rawSub.id:null);const customer=typeof invoice.customer==='string'?invoice.customer:null;const businessId=(sub?await findBusinessBySubscription(sub):undefined)||(customer?await findBusinessByStripeCustomer(customer):undefined);if(!businessId)return null;await db()`update businesses set subscription_status='past_due',billing_grace_until=now()+interval '7 days',billing_updated_at=now() where id=${businessId}`;await addBillingHistory({businessId,eventType:'invoice.payment_failed',amountTotal:invoice.amount_due,currency:invoice.currency,metadata:{invoiceId:invoice.id}});return businessId}

export async function beginWebhook(event:Stripe.Event){const inserted=await db()`insert into stripe_webhook_events(event_id,event_type,livemode,processing_started_at,attempts) values (${event.id},${event.type},${event.livemode},now(),1) on conflict(event_id) do nothing returning event_id`;if(inserted.length)return true;const retry=await db()`update stripe_webhook_events set processing_started_at=now(),attempts=attempts+1 where event_id=${event.id} and processed=false and (processing_started_at is null or processing_started_at<now()-interval '5 minutes') returning event_id`;return retry.length>0}
export async function finishWebhook(eventId:string,error?:unknown){if(error){await db()`update stripe_webhook_events set last_error=${String(error).slice(0,1000)} where event_id=${eventId}`;return}await db()`update stripe_webhook_events set processed=true,processed_at=now(),last_error=null where event_id=${eventId}`}
export async function addBillingHistory(input:{businessId:string;eventType:string;stripeEventId?:string|null;status?:string|null;plan?:string|null;amountTotal?:number|null;currency?:string|null;metadata?:Record<string,unknown>}){await db()`insert into billing_history(id,business_id,event_type,stripe_event_id,subscription_status,billing_plan,amount_total,currency,metadata) values (${`bill_${crypto.randomBytes(10).toString('hex')}`},${input.businessId},${input.eventType},${input.stripeEventId||null},${input.status||null},${input.plan||null},${input.amountTotal??null},${input.currency||null},${db().json(input.metadata||{})})`}
export async function listBillingHistory(businessId:string,limit=20){return db()`select event_type,subscription_status,billing_plan,amount_total,currency,metadata,created_at from billing_history where business_id=${businessId} order by created_at desc limit ${limit}`}
