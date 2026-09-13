import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { database } from '@/lib/db';
import { createPrivacyRequest,id } from '@/lib/store';
import { sameOrigin } from '@/lib/security';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const s=await currentSession();if(!s||s.role!=='manager'||!s.businessId)return NextResponse.json({error:'Unauthorized'},{status:401});
 const f=await req.formData(),customerId=String(f.get('customerId')||''),name=String(f.get('name')||'').trim(),action=f.get('action');
 const rows=await database()`select id from customers where id=${customerId} and business_id=${s.businessId} and active=true`;if(!rows.length)return NextResponse.json({error:'Nicht gefunden'},{status:404});
 if(action==='erasure'){await createPrivacyRequest(customerId,s.businessId,'erasure');return NextResponse.redirect(new URL('/manager/settings?privacyCreated=1',req.url),303);}
 if(action!=='edit'||!name||name.length>100)return NextResponse.redirect(new URL('/manager/customers?customerError=1',req.url),303);
 await database().begin(async tx=>{await tx`update customers set name=${name} where id=${customerId} and business_id=${s.businessId!}`;await tx`insert into audit_logs(id,business_id,actor_type,actor_id,action,target_type,target_id) values(${id('aud')},${s.businessId!},'manager',${s.sub},'customer.updated','kunde',${customerId})`;});
 return NextResponse.redirect(new URL('/manager/customers?customerSaved=1',req.url),303);
}
