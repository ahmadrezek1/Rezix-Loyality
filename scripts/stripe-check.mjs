import dotenv from 'dotenv';
import Stripe from 'stripe';
dotenv.config({path:'.env.local',quiet:true});

// Read-only: never creates customers, subscriptions, payments or webhooks.
const plans={STARTER:1900,PROFESSIONAL:3900,BUSINESS:7900};
const required=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','NEXT_PUBLIC_APP_URL',...Object.keys(plans).map(p=>`STRIPE_PRICE_${p}_MONTHLY`)];
const missing=required.filter(k=>!process.env[k]);
if(missing.length){console.error(`Missing settings: ${missing.join(', ')}`);process.exit(1);}
const key=process.env.STRIPE_SECRET_KEY;
if(!/^(sk|rk)_test_/.test(key)){console.error('This check requires a Stripe test/sandbox key.');process.exit(1);}
let failures=0;
function fail(message){failures++;console.error(message);}
try {
 const origin=new URL(process.env.NEXT_PUBLIC_APP_URL);
 if(origin.protocol!=='https:'&&origin.hostname!=='localhost')fail('APP_URL must use HTTPS outside localhost.');
 console.log(`Webhook destination: ${origin.origin}/api/billing/webhook`);
}catch{fail('NEXT_PUBLIC_APP_URL is invalid.');}
if(!process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_'))fail('Invalid webhook secret format.');
const stripe=new Stripe(key,{maxNetworkRetries:1,timeout:15000});
for(const [plan,amount] of Object.entries(plans)){
 try{
  const price=await stripe.prices.retrieve(process.env[`STRIPE_PRICE_${plan}_MONTHLY`]);
  if(price.livemode||!price.active||price.currency!=='eur'||price.unit_amount!==amount||price.type!=='recurring'||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||price.recurring?.usage_type!=='licensed'||price.billing_scheme!=='per_unit'||price.transform_quantity){fail(`${plan}: expected an active sandbox EUR ${amount/100}/month price with no quantity transformation.`);continue;}
  console.log(`${plan}: OK — EUR ${amount/100}/month, sandbox`);
 }catch(error){fail(`${plan}: Stripe check failed (${error.code||error.type||'request_error'}).`);}
}
console.log('Webhook delivery/signature and Customer Portal still require an end-to-end sandbox checkout.');
process.exitCode=failures?1:0;
