const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-typescript.cjs');
test('opening checkout cannot overwrite a subscription or trial status',async()=>{
 const queries=[];
 const sql=async(strings,...values)=>{queries.push(strings.join('?'));return [];};
 const billing=load('lib/billing.ts',{'./db':{database:()=>sql}});
 await billing.setCheckoutPending('salon','cus_test');
 assert.equal(queries.length,1);
 assert.doesNotMatch(queries[0],/subscription_status\s*=/);
});
test('customer creation retries use the same Stripe idempotency key',async()=>{
 const calls=[];
 const sql=async()=>[];
 class Stripe{customers={create:async(data,options)=>{calls.push(options.idempotencyKey);return {id:'cus_test'};}};}
 const billing=load('lib/billing.ts',{'./db':{database:()=>sql},stripe:Stripe},{STRIPE_SECRET_KEY:'sk_test_mock'});
 const input={business:{id:'salon',name:'Salon'},managerEmail:'test@example.invalid',managerName:'Manager'};
 await billing.ensureStripeCustomer(input);await billing.ensureStripeCustomer(input);
 assert.equal(calls.length,2);assert.equal(calls[0],calls[1]);
});
