import { NextResponse } from 'next/server';
import { getBusinessBySlug } from '@/lib/store';
import { customerSession } from '@/lib/customer-session';
import { billingOperational } from '@/lib/billing';
export async function GET(req:Request){
 const business=await getBusinessBySlug(new URL(req.url).searchParams.get('slug')||'');
 const c=business?await customerSession(business.id):null;
 if(!business||!c)return NextResponse.json({error:'Bitte bestätige deine E-Mail-Adresse.'},{status:401,headers:{'Cache-Control':'no-store'}});
 const {id,slug,name,rewardTarget,rewardText,logoUrl,stampUrl,cardTitle,cardSubtitle,primaryColor,stampShape,customerDesign}=business;
 return NextResponse.json({customer:{name:c.name,code:c.code,stamps:c.stamps,rewardsRedeemed:c.rewards_redeemed,lastVisitAt:c.last_visit_at},business:{id,slug,name,rewardTarget,rewardText,logoUrl,stampUrl,cardTitle,cardSubtitle,primaryColor,stampShape,customerDesign},operational:billingOperational(business)},{headers:{'Cache-Control':'no-store'}});
}
