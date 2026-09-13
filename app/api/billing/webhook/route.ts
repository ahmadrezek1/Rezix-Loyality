import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { addBillingHistory,beginWebhook,finishWebhook,markInvoicePaid,markInvoicePaymentFailed,stripe,syncSubscription } from '@/lib/billing';
import { audit } from '@/lib/security';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
  const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:'Webhook not configured'},{status:503});
  const signature=req.headers.get('stripe-signature');if(!signature)return NextResponse.json({error:'Missing signature'},{status:400});
  const body=await req.text();let event:Stripe.Event;
  try{event=stripe().webhooks.constructEvent(body,signature,secret)}catch(e){console.error('Stripe webhook signature:',e);return NextResponse.json({error:'Invalid signature'},{status:400})}
  try{
    if(!await beginWebhook(event))return NextResponse.json({received:true,duplicate:true});
    let businessId:string|undefined;
    switch(event.type){
      case 'checkout.session.completed':{
        const session=event.data.object as Stripe.Checkout.Session;const subId=typeof session.subscription==='string'?session.subscription:session.subscription?.id;const forced=session.metadata?.rezix_business_id||session.client_reference_id||undefined;
        if(subId){const sub=await stripe().subscriptions.retrieve(subId);businessId=await syncSubscription(sub,forced);await addBillingHistory({businessId,eventType:event.type,stripeEventId:event.id,status:sub.status,plan:session.metadata?.rezix_plan||null,amountTotal:session.amount_total,currency:session.currency,metadata:{checkoutSessionId:session.id}})}
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':{
        const sub=event.data.object as Stripe.Subscription;businessId=await syncSubscription(sub);await addBillingHistory({businessId,eventType:event.type,stripeEventId:event.id,status:sub.status,plan:sub.metadata?.rezix_plan||null,metadata:{subscriptionId:sub.id,cancelAtPeriodEnd:sub.cancel_at_period_end}});break;
      }
      case 'invoice.paid':businessId=(await markInvoicePaid(event.data.object as Stripe.Invoice))||undefined;break;
      case 'invoice.payment_failed':businessId=(await markInvoicePaymentFailed(event.data.object as Stripe.Invoice))||undefined;break;
      default:break;
    }
    if(businessId)await audit({actorType:'system',actorId:'stripe',businessId,action:`stripe.${event.type}`,targetType:'stripe_event',targetId:event.id,metadata:{livemode:event.livemode}}).catch(()=>{});
    await finishWebhook(event.id);return NextResponse.json({received:true});
  }catch(e){console.error('Stripe webhook processing:',e);await finishWebhook(event.id,e).catch(()=>{});return NextResponse.json({error:'Webhook processing failed'},{status:500})}
}
