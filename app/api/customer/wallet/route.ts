import { NextResponse } from 'next/server';
import { getBusinessBySlug } from '@/lib/store';
import { customerSession } from '@/lib/customer-session';
import { createWalletPass,walletAvailable } from '@/lib/apple-wallet';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(req:Request){
 const business=await getBusinessBySlug(new URL(req.url).searchParams.get('slug')||'');
 const customer=business?await customerSession(business.id):null;
 if(!business||!customer)return NextResponse.json({error:'Bitte melde dich erneut bei deiner Kundenkarte an.'},{status:401,headers});
 if(!walletAvailable())return NextResponse.json({error:'Apple Wallet ist noch nicht verfügbar.'},{status:503,headers});
 try{
  const pass=await createWalletPass(business,{id:customer.id,name:customer.name,code:customer.code});
  return new Response(new Uint8Array(pass),{headers:{...headers,'Content-Type':'application/vnd.apple.pkpass','Content-Disposition':'attachment; filename="rezix-kundenkarte.pkpass"'}});
 }catch{console.error('Apple Wallet: pass generation failed; check certificate configuration.');return NextResponse.json({error:'Die Wallet-Karte konnte nicht erstellt werden. Bitte versuche es später erneut.'},{status:503,headers});}
}
