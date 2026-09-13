import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { resolvePrivacyRequest,listPrivacyRequests } from '@/lib/store';
import { audit,sameOrigin } from '@/lib/security';
export async function POST(req:Request){
  const s=await currentSession(); if(!s||s.role!=='manager'||!s.businessId)return NextResponse.redirect(new URL('/manager/login',req.url),303);
  if(!sameOrigin(req)) return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
  const form=await req.formData(); const requestId=String(form.get('requestId')||''); const decision=String(form.get('decision')||''); const note=String(form.get('note')||'').slice(0,500);
  if(!requestId||(decision!=='completed'&&decision!=='rejected'))return NextResponse.redirect(new URL('/manager/settings?privacyError=1',req.url),303);
  if(decision==='completed'&&form.get('confirmErasure')!=='yes'){const requests=await listPrivacyRequests(s.businessId);if(requests.some(r=>r.id===requestId&&r.requestType==='erasure'))return NextResponse.redirect(new URL('/manager/settings?privacyError=1',req.url),303);}
  const result=await resolvePrivacyRequest({requestId,businessId:s.businessId,managerId:s.sub,decision,note});
  if(result.kind!=='ok')return NextResponse.redirect(new URL('/manager/settings?privacyError=1',req.url),303);
  await audit({session:s,businessId:s.businessId,action:`privacy.${result.requestType}.${decision}`,targetType:'kunde',targetId:result.customerId,req,metadata:{requestId,note:note||undefined}});
  return NextResponse.redirect(new URL('/manager/settings?privacyUpdated=1',req.url),303);
}
