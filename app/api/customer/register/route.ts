import { NextResponse } from 'next/server';
import { createCustomer,getBusiness,getCustomerByPhone } from '@/lib/store';
export async function POST(req:Request){
  const body=await req.json().catch(()=>null) as any;
  const name=String(body?.name||'').trim(); const phone=String(body?.phone||'').trim();
  if(!name||phone.length<6) return NextResponse.json({error:'Ungültige Angaben'},{status:400});
  if(!await getBusiness()) return NextResponse.json({error:'Shop ist noch nicht eingerichtet'},{status:503});
  let c=await getCustomerByPhone(phone);
  if(!c) c=await createCustomer({name,phone});
  return NextResponse.json({token:c.token});
}
