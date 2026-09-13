const {test}=require('node:test');const assert=require('node:assert/strict');const load=require('./load-typescript.cjs');
function fixture({stamps=0,ready=true,staff=true}={}){
 let customer={id:'test_customer',name:'Unit test',code:'RZX-ABCDEF12',stamps,rewards_redeemed:0};let visits=0,audits=0;const operations=new Map();
 const tag=async(strings,...values)=>{
  const sql=strings.join('?');
  if(sql.includes('from businesses'))return values[0]==='test_salon'?[{id:'test_salon',active:ready,reward_target:2,reward_text:'Reward',subscription_status:'active',billing_plan:'starter'}]:[];
  if(sql.includes('from staff_users'))return staff&&values[0]==='test_staff'&&values[1]==='test_salon'?[{id:'test_staff'}]:[];
  if(sql.includes('from loyalty_operations'))return operations.has(values[1])?[operations.get(values[1])]:[];
  if(sql.includes('from customers'))return values[0]===customer.code&&values[1]==='test_salon'?[{...customer}]:[];
  if(sql.startsWith('update customers')){customer.stamps=values[0];customer.rewards_redeemed+=values[1];return [{...customer}];}
  if(sql.startsWith('insert into visits')){visits++;return [];}
  if(sql.startsWith('insert into loyalty_operations')){operations.set(values[1],{staff_id:values[2],customer_code:values[3],operation:values[4],response:values[5]});return [];}
  if(sql.startsWith('insert into audit_logs')){audits++;return [];}
  throw Error('Unexpected SQL: '+sql);
 };
 tag.json=x=>x;tag.begin=async fn=>fn(tag);
 const store=load('lib/store.ts',{postgres:()=>tag,'./billing':{billingOperational:b=>b.active,friseurLimitFor:()=>1}});
 return {act:(key,op='stamp',code='RZX-ABCDEF12',salon='test_salon')=>store.loyaltyOperation(code,'test_staff',salon,key,op),state:()=>({customer,visits,audits})};
}
test('stamp retry with the same key is applied once',async()=>{const f=fixture();const a=await f.act('request-one');const b=await f.act('request-one');assert.equal(a.kind,'ok');assert.equal(b.response.customer.stamps,1);assert.equal(f.state().visits,1);assert.equal(f.state().audits,1)});
test('a new visit can use a new operation key',async()=>{const f=fixture();await f.act('one');await f.act('two');assert.equal(f.state().customer.stamps,2);assert.equal((await f.act('three')).kind,'not-ready')});
test('reward resets the card and increments redeemed count once',async()=>{const f=fixture({stamps:2});await f.act('redeem','redeem');await f.act('redeem','redeem');assert.equal(f.state().customer.stamps,0);assert.equal(f.state().customer.rewards_redeemed,1);assert.equal(f.state().visits,1)});
test('request key cannot be reused for a different action or customer',async()=>{const f=fixture();await f.act('one');assert.equal((await f.act('one','redeem')).kind,'conflict');assert.equal((await f.act('one','stamp','RZX-00000000')).kind,'conflict');assert.equal(f.state().visits,1)});
test('cross-salon requests and disabled staff cannot change loyalty',async()=>{const f=fixture();assert.equal((await f.act('one','stamp','RZX-ABCDEF12','another_salon')).kind,'blocked');assert.equal(f.state().visits,0);const disabled=fixture({staff:false});assert.equal((await disabled.act('one')).kind,'blocked')});
test('inactive salon and unearned rewards do not mutate',async()=>{const f=fixture({ready:false});assert.equal((await f.act('one')).kind,'blocked');assert.equal(f.state().visits,0);const early=fixture();assert.equal((await early.act('one','redeem')).kind,'not-ready')});
