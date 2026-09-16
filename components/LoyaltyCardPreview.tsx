'use client';
import {useState} from 'react';
import {Check,Gift,RotateCcw,Star,Heart,Coffee,Scissors} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {customerBackground,type CustomerDesign} from '@/lib/customer-design';
type Props={name:string;title:string;subtitle:string;reward:string;target:number;color:string;design:CustomerDesign;logoUrl?:string|null;stampUrl?:string|null;shape?:'circle'|'rounded'|'square';joinUrl?:string};
export default function LoyaltyCardPreview({name,title,subtitle,reward,target,color,design,logoUrl,stampUrl,shape='rounded',joinUrl}:Props){
 const [back,setBack]=useState(false);const [stamps,setStamps]=useState(3);
 const StampIcon={check:Check,star:Star,heart:Heart,gift:Gift,coffee:Coffee,scissors:Scissors}[design.stampSymbol||'check'];
 const safeTarget=Math.min(30,Math.max(2,Number.isFinite(target)?target:10));const filled=Math.min(stamps,safeTarget);
 return <div className="card-preview-shell"><div className="preview-toolbar"><span className="eyebrow">LIVE-VORSCHAU</span><button className="secondary" type="button" onClick={()=>setBack(!back)}><RotateCcw size={14}/>{back?'Vorderseite':'Rückseite'}</button></div>
  <div className="loyalty-live-card" style={{...customerBackground(design),'--card-accent':color} as React.CSSProperties}>
   <div className="live-card-content"><div className="live-card-top"><div>{logoUrl&&<img src={logoUrl} className="live-card-logo" alt="Betriebslogo"/>}<small>{title}</small><h3>{name||'Dein Betrieb'}</h3></div><span className="live-card-badge">TREUEKARTE</span></div>
   {back?<div className="live-card-back"><h4>Deine Belohnung</h4><p>{reward}</p><h4>So funktioniert’s</h4><p>Bei jedem Besuch einen Stempel sammeln. Mit {safeTarget} Stempeln löst dein Team die Belohnung ein.</p><p>{subtitle}</p>{joinUrl&&<a href={joinUrl} target="_blank" rel="noreferrer">Kundenseite öffnen →</a>}</div>:<><p className="live-card-subtitle">{subtitle}</p><div className="live-card-stamps">{Array.from({length:safeTarget},(_,i)=><span key={i} className={`live-stamp ${shape} ${i<filled?'is-filled':''}`}>{i<filled?<StampIcon size={20}/>:i===safeTarget-1?<Gift size={18}/>:i+1}</span>)}</div><div className="live-card-reward"><Gift size={22}/><div><small>{filled===safeTarget?'BELOHNUNG BEREIT':`NOCH ${safeTarget-filled} STEMPEL`}</small><b>{reward||'Deine Belohnung'}</b></div></div><div className="live-card-footer"><span>{filled} / {safeTarget}<small>Stempel gesammelt</small></span>{joinUrl?<QRCodeSVG value={joinUrl} size={64} marginSize={2} title="Anmeldelink"/>:<span className="preview-only-note">Vorschau<br/>ohne Kundenkonto</span>}</div></>}
  </div></div>
  <label className="preview-progress-control">Fortschritt testen <span>{filled}/{safeTarget}</span><input aria-label="Vorschau Stempelanzahl" type="range" min={0} max={safeTarget} value={filled} onChange={e=>setStamps(Number(e.target.value))}/></label>
  <p className="preview-caption">Vorschau der Rezix-Kundenkarte. Die Darstellung in Apple und Google Wallet kann abweichen.</p>
 </div>;
}
