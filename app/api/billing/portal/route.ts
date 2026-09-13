import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { getBusinessById } from '@/lib/store';
import { stripe } from '@/lib/billing';
import { audit,sameOrigin } from '@/lib/security';
export const runtime='nodejs';
export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
  const s=await currentSession();if(!s||s.role!=='manager'||!s.businessId)return NextResponse.redirect(new URL('/manager/login',req.url),303);
  const b=await getBusinessById(s.businessId);if(!b?.stripeCustomerId)return NextResponse.redirect(new URL('/manager/billing?error=no_customer',req.url),303);
  try{const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin;const portal=await stripe().billingPortal.sessions.create({customer:b.stripeCustomerId,return_url:`${origin}/manager/billing`});await audit({session:s,businessId:b.id,action:'billing.portal.opened',targetType:'stripe_customer',targetId:b.stripeCustomerId,req}).catch(()=>{});return NextResponse.redirect(portal.url,303)}catch(e){console.error(e);return NextResponse.redirect(new URL('/manager/billing?error=portal',req.url),303)}
}
