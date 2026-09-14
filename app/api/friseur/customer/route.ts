import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { getBusinessById,getCustomerByCodeForBusiness } from '@/lib/store';
import { sameOrigin } from '@/lib/security';
import { billingOperational } from '@/lib/billing';

export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const s=await currentSession();
 if(!s||s.role!=='friseur'||!s.businessId)return NextResponse.json({error:'Unauthorized'},{status:401});
 const business=await getBusinessById(s.businessId);
 if(!business||!billingOperational(business))return NextResponse.json({error:'Betriebs-Tarif ist nicht aktiv'},{status:402});
 const body=await req.json().catch(()=>null) as any;
 const code=String(body?.code||'').trim().toUpperCase();
 if(!/^RZX-[A-F0-9]{8}$/.test(code))return NextResponse.json({error:'Ungültiger Kundencode'},{status:400});
 const customer=await getCustomerByCodeForBusiness(code,s.businessId);
 if(!customer)return NextResponse.json({error:'Kunde dieses Betriebs nicht gefunden'},{status:404});
 return NextResponse.json({customer:{name:customer.name,code:customer.code,stamps:customer.stamps,rewardsRedeemed:customer.rewardsRedeemed},target:business.rewardTarget,rewardText:business.rewardText,rewardReady:customer.stamps>=business.rewardTarget});
}
