import { NextResponse } from 'next/server';
import { database } from '@/lib/db';
import { customerSession } from '@/lib/customer-session';
import { createCustomerPin } from '@/lib/customer-pin';
import { sameOrigin } from '@/lib/security';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});const body=await req.json().catch(()=>null);const businessId=String(body?.businessId||'');const pin=String(body?.pin||'');if(!/^\d{4}$/.test(pin))return NextResponse.json({error:'Bitte eine 4-stellige PIN wählen.'},{status:400});const c=await customerSession(businessId);if(!c)return NextResponse.json({error:'Nicht angemeldet.'},{status:401});const p=createCustomerPin(pin);await database()`update customers set pin_salt=${p.salt},pin_hash=${p.hash},pin_set_at=now() where id=${c.id} and business_id=${businessId}`;return NextResponse.json({ok:true});}
