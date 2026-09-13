import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { addStampAtomic } from '@/lib/store';
export async function POST(req:Request){
  const s=await currentSession(); if(!s||!['staff','manager'].includes(s.role)) return NextResponse.json({error:'Unauthorized'},{status:401});
  const body=await req.json().catch(()=>null) as any; const code=String(body?.code||'').trim().toUpperCase();
  const result=await addStampAtomic(code,s.sub);
  if(result.kind==='not-found') return NextResponse.json({error:'Kunde nicht gefunden'},{status:404});
  if(result.kind==='no-business') return NextResponse.json({error:'Shop ist noch nicht eingerichtet'},{status:503});
  if(result.kind==='reward-ready') return NextResponse.json({error:'Belohnung muss zuerst eingelöst werden'},{status:409});
  return NextResponse.json({customer:{name:result.customer.name,code:result.customer.code,stamps:result.customer.stamps},target:result.target});
}
