import { NextResponse } from 'next/server';
import { getCustomerByToken,getCustomerExport } from '@/lib/store';
import { audit,sameOrigin } from '@/lib/security';
export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
  const body=await req.json().catch(()=>null) as any;const token=String(body?.token||'');
  const c=await getCustomerByToken(token);if(!c)return NextResponse.json({error:'Nicht gefunden'},{status:404});
  const data=await getCustomerExport(c.id,c.businessId);if(!data)return NextResponse.json({error:'Nicht gefunden'},{status:404});
  await audit({actorType:'kunde',actorId:c.id,businessId:c.businessId,action:'privacy.exported',targetType:'kunde',targetId:c.id,req});
  return new NextResponse(JSON.stringify(data,null,2),{headers:{'content-type':'application/json; charset=utf-8','content-disposition':`attachment; filename="rezix-daten-${c.code}.json"`,'cache-control':'no-store'}});
}
