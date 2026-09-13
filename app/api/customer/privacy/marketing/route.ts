import { customerSession } from '@/lib/customer-session';
import { getBusinessBySlug } from '@/lib/store';
import { NextResponse } from 'next/server';
import { addConsentRecord,updateMarketingConsent } from '@/lib/store';
import { audit,hashPrivate,requestIp,sameOrigin } from '@/lib/security';
import { POLICY_VERSION } from '@/lib/legal';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
 const body=await req.json().catch(()=>null) as any;const granted=body?.granted===true;
 const salon=await getBusinessBySlug(String(body?.slug||''));const row=salon?await customerSession(salon.id):null;const c=row?{id:row.id as string,code:row.code as string,businessId:row.business_id as string}:null;if(!c)return NextResponse.json({error:'Nicht gefunden'},{status:404});
 const updated=await updateMarketingConsent(c.id,c.businessId,granted);if(!updated)return NextResponse.json({error:'Nicht gefunden'},{status:404});
 await addConsentRecord({businessId:c.businessId,customerId:c.id,type:'marketing',granted,policyVersion:POLICY_VERSION,ipHash:hashPrivate(requestIp(req)),userAgent:req.headers.get('user-agent')});
 await audit({actorType:'kunde',actorId:c.id,businessId:c.businessId,action:granted?'privacy.marketing.granted':'privacy.marketing.withdrawn',targetType:'kunde',targetId:c.id,req});
 return NextResponse.json({ok:true,marketingConsent:granted});
}
