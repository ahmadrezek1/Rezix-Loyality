'use client';
import { useState } from 'react';
import { Wallet } from 'lucide-react';
export default function WalletButton({slug}:{slug:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function download(){
  if(busy)return;setBusy(true);setError('');
  try{
   const response=await fetch(`/api/customer/wallet?slug=${encodeURIComponent(slug)}`,{cache:'no-store'});
   if(!response.ok){const body=await response.json();throw new Error(body.error);}
   const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='rezix-kundenkarte.pkpass';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError(e instanceof Error?e.message:'Apple Wallet ist gerade nicht verfügbar.');}finally{setBusy(false);}
 }
 return <div className="wallet-action"><button type="button" className="secondary" onClick={download} disabled={busy}><Wallet size={19}/>{busy?'Karte wird erstellt…':'Zu Apple Wallet hinzufügen'}</button><small>Mitgliedskarte mit QR-Code. Deinen aktuellen Stempelstand siehst du hier auf der Webseite.</small>{error&&<p role="alert" className="alert">{error}</p>}</div>;
}
