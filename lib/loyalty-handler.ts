import { NextResponse } from 'next/server';
import { currentSession } from './auth';
import { loyaltyOperation } from './store';
import { sameOrigin,consumeRateLimit } from './security';
export async function handleLoyalty(req:Request,operation:'stamp'|'redeem'){
 if(!sameOrigin(req))return NextResponse.json({error:'Ungültige Anfrage'},{status:403});
 const s=await currentSession();if(!s||s.role!=='friseur'||!s.businessId)return NextResponse.json({error:'Nicht angemeldet'},{status:401});
 if(!await consumeRateLimit('loyalty',s.sub,120,1))return NextResponse.json({error:'Zu viele Anfragen. Bitte kurz warten.'},{status:429});
 const body=await req.json().catch(()=>null);const code=String(body?.code||'').trim().toUpperCase(),requestId=req.headers.get('idempotency-key')||'';
 if(!/^RZX-[A-F0-9]{8}$/.test(code)||! /^[a-f0-9-]{36}$/i.test(requestId))return NextResponse.json({error:'Ungültiger Kundencode oder fehlende Vorgangs-ID.'},{status:400});
 try{
  const result=await loyaltyOperation(code,s.sub,s.businessId,requestId,operation);
  if(result.kind==='ok')return NextResponse.json(result.response);
  const status=result.kind==='blocked'?402:result.kind==='not-found'?404:409;
  return NextResponse.json({error:result.kind==='blocked'?'Salon-Tarif oder Zugang ist nicht aktiv.':result.kind==='not-found'?'Kunde dieses Salons nicht gefunden.':'Kartenstatus geändert. Bitte Kundenkarte erneut laden.'},{status});
 }catch(error){console.error('Loyalty operation failed');return NextResponse.json({error:'Vorgang konnte nicht bestätigt werden. Bitte mit derselben Aktion erneut versuchen.'},{status:503});}
}
