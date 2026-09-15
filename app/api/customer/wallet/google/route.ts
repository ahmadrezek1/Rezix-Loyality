import { NextResponse } from 'next/server';
import { getBusinessBySlug } from '@/lib/store';
import { customerSession } from '@/lib/customer-session';
import { createGoogleWalletLink,googleWalletAvailable } from '@/lib/google-wallet';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(req:Request){
 const business=await getBusinessBySlug(new URL(req.url).searchParams.get('slug')||'');
 const customer=business?await customerSession(business.id):null;
 if(!business||!customer)return NextResponse.json({error:'Bitte melde dich erneut bei deiner Kundenkarte an.'},{status:401,headers});
 if(!googleWalletAvailable())return NextResponse.json({error:'Google Wallet wird vorbereitet und ist noch nicht freigeschaltet.'},{status:503,headers});
 try{return NextResponse.json({url:createGoogleWalletLink(business,{id:customer.id,name:customer.name,code:customer.code})},{headers});}
 catch{return NextResponse.json({error:'Die Wallet-Karte konnte nicht erstellt werden. Bitte versuche es später erneut.'},{status:503,headers});}
}
