import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { getBusinessById,getStaffById } from '@/lib/store';
import { ensureStripeCustomer,priceId,setCheckoutPending,stripe,type BillingInterval,type BillingPlanKey } from '@/lib/billing';
import { audit,sameOrigin } from '@/lib/security';

export const runtime='nodejs';
export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
  const s=await currentSession();
  if(!s||s.role!=='manager'||!s.businessId)return NextResponse.redirect(new URL('/manager/login',req.url),303);
  const f=await req.formData();
  const plan=String(f.get('plan')||'') as BillingPlanKey;
  const interval=String(f.get('interval')||'monthly') as BillingInterval;
  if(!['starter','professional','business'].includes(plan)||!['monthly','yearly'].includes(interval))return NextResponse.redirect(new URL('/manager/billing?error=plan',req.url),303);
  const [business,manager]=await Promise.all([getBusinessById(s.businessId),getStaffById(s.sub)]);
  if(!business||!manager)return NextResponse.redirect(new URL('/manager/billing?error=account',req.url),303);
  if(business.stripeSubscriptionId&&['active','trialing','past_due','unpaid','paused'].includes(business.subscriptionStatus))return NextResponse.redirect(new URL('/manager/billing?manage=1',req.url),303);
  try{
    const customerId=await ensureStripeCustomer({business,managerEmail:manager.email,managerName:manager.name});
    const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin;
    const session=await stripe().checkout.sessions.create({
      mode:'subscription',customer:customerId,
      line_items:[{price:priceId(plan,interval),quantity:1}],
      success_url:`${origin}/manager/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${origin}/manager/billing?checkout=cancelled`,
      client_reference_id:business.id,
      metadata:{rezix_business_id:business.id,rezix_plan:plan,rezix_interval:interval},
      subscription_data:{metadata:{rezix_business_id:business.id,rezix_plan:plan}},
      allow_promotion_codes:true,
      billing_address_collection:'required',
      tax_id_collection:{enabled:true},
      customer_update:{address:'auto',name:'auto'},
      automatic_tax:{enabled:process.env.STRIPE_AUTOMATIC_TAX==='true'}
    });
    await setCheckoutPending(business.id,customerId);
    await audit({session:s,businessId:business.id,action:'billing.checkout.created',targetType:'stripe_checkout',targetId:session.id,req,metadata:{plan,interval}}).catch(()=>{});
    if(!session.url)throw new Error('Stripe Checkout URL fehlt');
    return NextResponse.redirect(session.url,303);
  }catch(e){console.error(e);await audit({session:s,businessId:s.businessId,action:'billing.checkout.failed',req,metadata:{plan,interval,error:String(e).slice(0,300)}}).catch(()=>{});return NextResponse.redirect(new URL('/manager/billing?error=stripe',req.url),303)}
}
