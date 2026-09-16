const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-typescript.cjs');
function fixture({configured=true,customer=true}={}){
 return load('app/api/customer/wallet/google/route.ts',{
  'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options),redirect:(url,status)=>Response.redirect(url,status)}},
  '@/lib/store':{getBusinessBySlug:async()=>({id:'salon',name:'Salon'})},
  '@/lib/customer-session':{customerSession:async()=>customer?{id:'customer',code:'RZX-123'}:null},
  '@/lib/google-wallet':{googleWalletConfigured:()=>configured,googleSaveUrl:async()=> 'https://pay.google.com/gp/v/save/signed-pass'},
 });
}
test('Wallet button receives a non-cacheable Google save URL while direct links redirect',async()=>{
 const api=fixture();const json=await api.GET(new Request('https://example.test/api/customer/wallet/google?slug=salon&format=json'));
 assert.equal(json.status,200);assert.equal(json.headers.get('cache-control'),'no-store');assert.equal((await json.json()).url,'https://pay.google.com/gp/v/save/signed-pass');
 const link=await api.GET(new Request('https://example.test/api/customer/wallet/google?slug=salon'));
 assert.equal(link.status,302);assert.equal(link.headers.get('location'),'https://pay.google.com/gp/v/save/signed-pass');
});
test('Wallet errors remain readable and never issue an anonymous pass',async()=>{
 for(const [options,status] of [[{configured:false},503],[{customer:false},401]]){
 const result=await fixture(options).GET(new Request('https://example.test/api/customer/wallet/google?slug=salon&format=json'));
 assert.equal(result.status,status);assert.ok((await result.json()).error);
 }
});
