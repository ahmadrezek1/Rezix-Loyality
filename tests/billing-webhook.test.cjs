const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function handler({claim='claimed',invalid=false,fail=false,type='invoice.paid',secret='whsec_test'}={}){
 const calls=[];
 const event={id:'evt_test',type,data:{object:{id:'in_test'}}};
 const billing={stripe:()=>({webhooks:{constructEvent:(body)=>{calls.push(['body',body]);if(invalid)throw Error('signature');return event}},subscriptions:{retrieve:async()=>({id:'sub_test',status:'active',metadata:{}})}}),beginWebhook:async()=>claim,finishWebhook:async(id,error)=>calls.push(['finish',id,!!error]),markInvoicePaid:async(invoice,id)=>{calls.push(['paid',id]);if(fail)throw Error('database');return 'salon_test'},syncSubscription:async()=> 'salon_test',addBillingHistory:async()=>{}};
 const exports={};
 const code=ts.transpileModule(fs.readFileSync('app/api/billing/webhook/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,process:{env:{STRIPE_WEBHOOK_SECRET:secret}},console:{error:()=>{}},require:name=>name==='next/server'?{NextResponse:{json:(data,options)=>Response.json(data,options)}}:name==='@/lib/billing'?billing:{audit:async()=>{}}});
 return {calls,post:(signature='test')=>exports.POST(new Request('http://localhost/api/billing/webhook',{method:'POST',headers:signature?{'stripe-signature':signature}:{},body:'{"raw":  true}'}))};
}
test('unconfigured webhook returns 503',async()=>assert.equal((await handler({secret:''}).post()).status,503));
test('missing and invalid signatures return 400',async()=>{assert.equal((await handler().post('')).status,400);assert.equal((await handler({invalid:true}).post()).status,400)});
test('completed duplicates do not process again',async()=>{const h=handler({claim:'duplicate'});assert.equal((await h.post()).status,200);assert.equal(h.calls.length,1)});
test('in-flight deliveries return retryable 503 without releasing another worker claim',async()=>{const h=handler({claim:'busy'});const r=await h.post();assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'30');assert.equal(h.calls.length,1)});
test('successful event verifies untouched body and records event id',async()=>{const h=handler();assert.equal((await h.post()).status,200);assert.deepEqual(h.calls,[['body','{"raw":  true}'],['paid','evt_test'],['finish','evt_test',false]])});
test('processing errors release the claimed event for retries',async()=>{const h=handler({fail:true});assert.equal((await h.post()).status,500);assert.deepEqual(h.calls.at(-1),['finish','evt_test',true])});
test('irrelevant signed events are acknowledged',async()=>{const h=handler({type:'customer.created'});assert.equal((await h.post()).status,200);assert.equal(h.calls.some(c=>c[0]==='paid'),false)});
