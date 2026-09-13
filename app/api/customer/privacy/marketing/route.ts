import { NextResponse } from 'next/server';
import { addConsentRecord,getCustomerByToken,updateMarketingConsent } from '@/lib/store';
import { audit,hashPrivate,requestIp,sameOrigin } from '@/lib/security';
const POLICY_VERSION='2026-09-v1';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
 const body=await req.json().catch(()=>null) as any;const token=String(body?.token||'');const granted=body?.granted===true;
 const c=await getCustomerByToken(token);if(!c)return NextResponse.json({error:'Nicht gefunden'},{status:404});
 const updated=await updateMarketingConsent(c.id,c.businessId,granted);if(!updated)return NextResponse.json({error:'Nicht gefunden'},{status:404});
 await addConsentRecord({businessId:c.businessId,customerId:c.id,type:'marketing',granted,policyVersion:POLICY_VERSION,ipHash:hashPrivate(requestIp(req)),userAgent:req.headers.get('user-agent')});
 await audit({actorType:'kunde',actorId:c.id,businessId:c.businessId,action:granted?'privacy.marketing.granted':'privacy.marketing.withdrawn',targetType:'kunde',targetId:c.id,req});
 return NextResponse.json({ok:true,marketingConsent:granted});
}
