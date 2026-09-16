'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
export default function WalletButton({slug}:{slug:string}){
 const [busy,setBusy]=useState<'apple'|'google'|null>(null),[error,setError]=useState('');
 async function download(provider:'apple'|'google'){
  if(busy)return;setBusy(provider);setError('');
  try{
   const response=await fetch(`/api/customer/wallet${provider==='google'?'/google':''}?slug=${encodeURIComponent(slug)}&format=json`,{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok){const body=await response.json();throw new Error(body.error);}
   if(provider==='google'){const body=await response.json();const target=new URL(body.url);if(target.origin!=='https://pay.google.com')throw new Error('Ungültiger Wallet-Link');window.location.assign(target.href);return;}
   const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='rezix-kundenkarte.pkpass';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError(e instanceof Error?e.message:'Wallet ist gerade nicht verfügbar.');}finally{setBusy(null);}
 }
 return <div className="wallet-action"><div className="page-actions"><button type="button" className="wallet-button apple-wallet" onClick={()=>download('apple')} disabled={!!busy}>{busy==='apple'?<Loader2 className="spin" size={28}/>:<WalletMark provider="apple"/>}<span>{busy==='apple'?'Karte wird erstellt…':'Add to Apple Wallet'}</span></button><button type="button" className="wallet-button google-wallet" onClick={()=>download('google')} disabled={!!busy}>{busy==='google'?<Loader2 className="spin" size={28}/>:<WalletMark provider="google"/>}<span>{busy==='google'?'Karte wird erstellt…':'Add to Google Wallet'}</span></button></div><small>Mitgliedskarte mit QR-Code im Design deines Betriebs. Deinen aktuellen Stempelstand siehst du hier auf der Webseite.</small>{error&&<p role="alert" className="alert">{error}</p>}</div>;
}

function WalletMark({provider}:{provider:'apple'|'google'}){return <svg viewBox="0 0 48 40" width="38" height="32" aria-hidden="true"><rect x="2" y="1" width="44" height="37" rx="9" fill={provider==='google'?'#30a853':'#c8ccca'}/><path d="M3 14Q3 7 10 7H38Q45 7 45 14V28H3Z" fill="#fbbc04"/><path d="M3 20Q3 13 10 13H38Q45 13 45 20V31H3Z" fill={provider==='google'?'#ea4335':'#77bc67'}/><path d="M3 24Q3 19 10 19H38Q45 19 45 24V34H3Z" fill={provider==='google'?'#ea4335':'#f36b59'}/><path d="M2 18L28 25Q34 27 40 22L46 18V30Q46 39 37 39H11Q2 39 2 30Z" fill={provider==='google'?'#4285f4':'#dad8cf'}/></svg>}
