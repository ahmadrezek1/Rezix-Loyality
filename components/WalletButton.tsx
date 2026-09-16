'use client';
import { useState } from 'react';
import { Wallet } from 'lucide-react';
export default function WalletButton({slug}:{slug:string}){
 const [busy,setBusy]=useState<'apple'|'google'|null>(null),[error,setError]=useState('');
 async function download(provider:'apple'|'google'){
  if(busy)return;setBusy(provider);setError('');
  try{
   const response=await fetch(`/api/customer/wallet${provider==='google'?'/google':''}?slug=${encodeURIComponent(slug)}`,{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok){const body=await response.json();throw new Error(body.error);}
   if(provider==='google'){const body=await response.json();const target=new URL(body.url);if(target.origin!=='https://pay.google.com')throw new Error('Ungültiger Wallet-Link');window.location.assign(target.href);return;}
   const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='rezix-kundenkarte.pkpass';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError(e instanceof Error?e.message:'Wallet ist gerade nicht verfügbar.');}finally{setBusy(null);}
 }
 return <div className="wallet-action"><div className="page-actions"><button type="button" className="secondary" onClick={()=>download('apple')} disabled={!!busy}><Wallet size={19}/>{busy==='apple'?'Karte wird erstellt…':'Zu Apple Wallet hinzufügen'}</button><button type="button" className="secondary" onClick={()=>download('google')} disabled={!!busy}><Wallet size={19}/>{busy==='google'?'Karte wird erstellt…':'Zu Google Wallet hinzufügen'}</button></div><small>Mitgliedskarte mit QR-Code im Design deines Betriebs. Deinen aktuellen Stempelstand siehst du hier auf der Webseite.</small>{error&&<p role="alert" className="alert">{error}</p>}</div>;
}
