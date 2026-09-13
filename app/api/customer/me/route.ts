import { NextResponse } from 'next/server';
import { getBusiness, getCustomerByToken } from '@/lib/store';
export async function GET(req:Request){
  const token=new URL(req.url).searchParams.get('token')||'';
  const [c,business]=await Promise.all([getCustomerByToken(token),getBusiness()]);
  if(!c||!business) return NextResponse.json({error:'Nicht gefunden'},{status:404});
  return NextResponse.json({customer:{name:c.name,code:c.code,stamps:c.stamps,rewardsRedeemed:c.rewardsRedeemed,lastVisitAt:c.lastVisitAt},business});
}
