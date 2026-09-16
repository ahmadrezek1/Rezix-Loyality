import { NextResponse } from 'next/server';
import { getBusinessBySlug } from '@/lib/store';
import { customerSession } from '@/lib/customer-session';
import { googleSaveUrl,googleWalletConfigured } from '@/lib/google-wallet';
export const runtime='nodejs';
export async function GET(req:Request){
 try{
  const u=new URL(req.url),slug=u.searchParams.get('slug')||'';const b=await getBusinessBySlug(slug);if(!b)return NextResponse.json({error:'Betrieb nicht gefunden.'},{status:404});
  const c=await customerSession(b.id);if(!c)return NextResponse.json({error:'Nicht angemeldet.'},{status:401});if(!googleWalletConfigured())return NextResponse.json({error:'Google Wallet ist noch nicht konfiguriert.'},{status:503});
  const origin=process.env.NEXT_PUBLIC_APP_URL||u.origin;const url=await googleSaveUrl({id:c.id,code:c.code,name:c.name,stamps:c.stamps,rewards_redeemed:c.rewards_redeemed},{id:b.id,name:b.name,reward_target:b.rewardTarget,reward_text:b.rewardText,primary_color:b.primaryColor,logo_url:b.logoUrl},origin);
  if(u.searchParams.get('format')==='json')return NextResponse.json({url},{headers:{'Cache-Control':'no-store'}});
  return NextResponse.redirect(url,302);
 }catch(e){console.error('google wallet',e);return NextResponse.json({error:'Google Wallet Karte konnte nicht erstellt werden.'},{status:500});}
}
