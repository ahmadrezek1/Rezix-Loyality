import { NextResponse } from 'next/server';
import { createPrivacyRequest,getCustomerByToken } from '@/lib/store';
import { audit,sameOrigin } from '@/lib/security';
export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
  const body=await req.json().catch(()=>null) as any; const token=String(body?.token||''); const type=String(body?.type||'');
  if(type!=='erasure'&&type!=='access')return NextResponse.json({error:'Ungültiger Anfragetyp'},{status:400});
  const c=await getCustomerByToken(token); if(!c)return NextResponse.json({error:'Nicht gefunden'},{status:404});
  const requestId=await createPrivacyRequest(c.id,c.businessId,type);
  await audit({actorType:'kunde',actorId:c.id,businessId:c.businessId,action:`privacy.${type}.requested`,targetType:'privacy_request',targetId:requestId,req});
  return NextResponse.json({ok:true,requestId});
}
