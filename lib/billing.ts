import crypto from 'node:crypto';
import { database as db } from './db';
import Stripe from 'stripe';
import type { Business } from './store';

export type BillingPlanKey='starter'|'professional'|'business';
export type BillingInterval='monthly';
export type PlanDefinition={key:BillingPlanKey;name:string;monthlyLabel:string;friseurLimit:number;features:string[]};

export const BILLING_PLANS:PlanDefinition[]=[
  {key:'starter',name:'Starter',monthlyLabel:'19 €',friseurLimit:1,features:['1 Salon','1 Friseur','Digitale Kundenkarte','Loyalty & Rewards']},
  {key:'professional',name:'Professional',monthlyLabel:'39 €',friseurLimit:5,features:['1 Salon','Bis zu 5 Friseure','Analytics','Custom Branding','Erweiterte Loyalty']},
  {key:'business',name:'Business',monthlyLabel:'79 €',friseurLimit:100,features:['Bis zu 100 Friseure','Erweiterte Administration','Priorisierter Support','Für wachsende Betriebe']}
];

let stripeClient:Stripe|null=null;
export function stripe(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('STRIPE_SECRET_KEY fehlt');if(!stripeClient)stripeClient=new Stripe(key);return stripeClient}

export function priceId(plan:BillingPlanKey,interval:BillingInterval){const key=`STRIPE_PRICE_${plan.toUpperCase()}_${interval==='monthly'?'MONTHLY':'YEARLY'}`;const value=process.env[key];if(!value)throw new Error(`${key} fehlt`);return value}
export function planFromPrice(price:string|null|undefined):BillingPlanKey|null{if(!price)return null;for(const p of BILLING_PLANS){if(price===process.env[`STRIPE_PRICE_${p.key.toUpperCase()}_MONTHLY`]||price===process.env[`STRIPE_PRICE_${p.key.toUpperCase()}_YEARLY`])return p.key}return null}
export function planDefinition(plan:string|null|undefined){return BILLING_PLANS.find(p=>p.key===plan)||null}
export function friseurLimitFor(plan:string,status?:string){if(status==='trialing'||plan==='trial')return 1;return planDefinition(plan)?.friseurLimit??0}

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
  const item=subscription.items.data[0];const price=item?.price?.id||null;const plan=planFromPrice(price);if(!plan)throw new Error(`Unbekannter Stripe Preis: ${price}`);
  const status=subscription.status==='canceled'?'canceled':subscription.status;
  const currentEnd=toDateFromUnix((subscription as any).current_period_end ?? item?.current_period_end);
  const grace=status==='past_due'?new Date(Date.now()+7*24*3600_000):null;
  await db()`update businesses set stripe_customer_id=${customerId},stripe_subscription_id=${subscription.id},stripe_price_id=${price},billing_plan=${plan},subscription_status=${status},subscription_current_period_end=${currentEnd},cancel_at_period_end=${subscription.cancel_at_period_end},billing_grace_until=case when ${status}='past_due' then coalesce(billing_grace_until,${grace}) else null end,billing_updated_at=now() where id=${businessId}`;
  return businessId;
}

async function syncInvoice(invoice:Stripe.Invoice,eventType:'invoice.paid'|'invoice.payment_failed',eventId?:string){
 const legacy=invoice as Stripe.Invoice & {subscription?:string|Stripe.Subscription|null};
 const rawSub=legacy.subscription??invoice.parent?.subscription_details?.subscription;
 const subscriptionId=typeof rawSub==='string'?rawSub:rawSub?.id;
 if(!subscriptionId)return null;
 const subscription=await stripe().subscriptions.retrieve(subscriptionId);
 const businessId=await syncSubscription(subscription);
 await addBillingHistory({businessId,eventType,stripeEventId:eventId,status:subscription.status,amountTotal:eventType==='invoice.paid'?invoice.amount_paid:invoice.amount_due,currency:invoice.currency,metadata:{invoiceId:invoice.id}});
 return businessId;
}
export async function markInvoicePaid(invoice:Stripe.Invoice,eventId?:string){return syncInvoice(invoice,'invoice.paid',eventId)}
export async function markInvoicePaymentFailed(invoice:Stripe.Invoice,eventId?:string){return syncInvoice(invoice,'invoice.payment_failed',eventId)}

export async function beginWebhook(event:Stripe.Event){const inserted=await db()`insert into stripe_webhook_events(event_id,event_type,livemode,processing_started_at,attempts) values (${event.id},${event.type},${event.livemode},now(),1) on conflict(event_id) do nothing returning event_id`;if(inserted.length)return 'claimed' as const;const retry=await db()`update stripe_webhook_events set processing_started_at=now(),attempts=attempts+1 where event_id=${event.id} and processed=false and (processing_started_at is null or processing_started_at<now()-interval '5 minutes') returning event_id`;if(retry.length)return 'claimed' as const;const rows=await db()`select processed from stripe_webhook_events where event_id=${event.id}`;return rows[0]?.processed?'duplicate' as const:'busy' as const}
export async function finishWebhook(eventId:string,error?:unknown){if(error){await db()`update stripe_webhook_events set processing_started_at=null,last_error=${String(error).slice(0,1000)} where event_id=${eventId}`;return}await db()`update stripe_webhook_events set processed=true,processed_at=now(),last_error=null where event_id=${eventId}`}
export async function addBillingHistory(input:{businessId:string;eventType:string;stripeEventId?:string|null;status?:string|null;plan?:string|null;amountTotal?:number|null;currency?:string|null;metadata?:Record<string,unknown>}){await db()`insert into billing_history(id,business_id,event_type,stripe_event_id,subscription_status,billing_plan,amount_total,currency,metadata) values (${`bill_${crypto.randomBytes(10).toString('hex')}`},${input.businessId},${input.eventType},${input.stripeEventId||null},${input.status||null},${input.plan||null},${input.amountTotal??null},${input.currency||null},${db().json((input.metadata||{}) as any)})`}
export async function listBillingHistory(businessId:string,limit=20){return db()`select event_type,subscription_status,billing_plan,amount_total,currency,metadata,created_at from billing_history where business_id=${businessId} order by created_at desc limit ${limit}`}
