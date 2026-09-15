'use client';
import { useMemo,useState } from 'react';
import CustomerDesignFields from './CustomerDesignFields';
import { customerBackground,defaultCustomerDesign,type CustomerDesign } from '@/lib/customer-design';
import { Check,Gift,Palette,Scissors,Smartphone } from 'lucide-react';

type Props={business:{customerDesign:CustomerDesign;name:string;rewardTarget:number;rewardText:string;logoUrl:string|null;stampUrl:string|null;cardTitle:string;cardSubtitle:string;primaryColor:string;stampShape:'circle'|'rounded'|'square'}};
type Platform='apple'|'google';
type Face='front'|'back';
export default function LoyaltyDesigner({business}:Props){
 const [design,setDesign]=useState(business.customerDesign||defaultCustomerDesign);
 const [target,setTarget]=useState(business.rewardTarget);const [reward,setReward]=useState(business.rewardText);const [title,setTitle]=useState(business.cardTitle);const [subtitle,setSubtitle]=useState(business.cardSubtitle);const [color,setColor]=useState(business.primaryColor);const [shape,setShape]=useState(business.stampShape);
 const [platform,setPlatform]=useState<Platform>('apple'); const [face,setFace]=useState<Face>('front');
 const filled=Math.min(6,target); const stamps=useMemo(()=>Array.from({length:Math.min(target,10)}),[target]);
 return <section className="program-editor">
  <div className="program-editor-head"><div><span className="eyebrow">TREUEPROGRAMM</span><h1>Karte gestalten</h1><p className="muted">Design, Belohnung und Kartendetails an einem Ort. Änderungen werden erst nach dem Speichern veröffentlicht.</p></div><div className="program-status"><span className="status-dot"/> Aktiv</div></div>
  <div className="program-editor-grid">
   <form className="program-editor-form" method="post" action="/api/manager/loyalty-config" encType="multipart/form-data">
    <div className="editor-section"><div className="editor-section-title"><Gift size={18}/><div><b>Belohnung</b><span>Was Kunden sammeln und erhalten</span></div></div><div className="form-split"><div><label>Anzahl der Stempel</label><input name="rewardTarget" type="number" min="2" max="30" value={target} onChange={e=>setTarget(Number(e.target.value)||2)} required/></div><div><label>Stempel-Form</label><select name="stampShape" value={shape} onChange={e=>setShape(e.target.value as Props['business']['stampShape'])}><option value="circle">Kreis</option><option value="rounded">Abgerundet</option><option value="square">Quadrat</option></select></div></div><label>Belohnung</label><input name="rewardText" value={reward} onChange={e=>setReward(e.target.value)} maxLength={160} required/></div>
    <div className="editor-section"><div className="editor-section-title"><Smartphone size={18}/><div><b>Kartendetails</b><span>Texte auf der Wallet-Karte</span></div></div><label>Kartentitel</label><input name="cardTitle" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required/><label>Untertitel</label><input name="cardSubtitle" value={subtitle} onChange={e=>setSubtitle(e.target.value)} maxLength={160} required/></div>
    <div className="editor-section"><div className="editor-section-title"><Palette size={18}/><div><b>Look & Feel</b><span>Logo, Farbe und Hintergrund</span></div></div><label>Akzentfarbe</label><div className="color-control"><input name="primaryColor" type="color" value={color} onChange={e=>setColor(e.target.value)}/><input value={color} onChange={e=>setColor(e.target.value)} pattern="#[0-9A-Fa-f]{6}" aria-label="Hex-Farbe"/></div><div className="form-split"><div><label>Neues Betriebs-Logo</label><input name="logo" type="file" accept="image/png,image/jpeg,image/webp"/></div><div><label>Neuer Stempel</label><input name="stamp" type="file" accept="image/png,image/jpeg,image/webp"/></div></div><CustomerDesignFields design={design} onChange={setDesign}/></div>
    <div className="editor-savebar"><span><Check size={16}/> Alles bleibt bearbeitbar</span><button className="gold" type="submit">Änderungen speichern</button></div>
   </form>
   <aside className="wallet-live-panel">
    <div className="wallet-live-head"><div><span className="live-pill"><i/> LIVE</span><b>Wallet-Vorschau</b></div><span className="muted">So sieht es dein Kunde</span></div>
    <div className="preview-switch"><button type="button" className={platform==='apple'?'active':''} onClick={()=>setPlatform('apple')}>Apple Wallet</button><button type="button" className={platform==='google'?'active':''} onClick={()=>setPlatform('google')}>Google Wallet</button></div>
    <div className={`wallet-device ${platform}`}><div className="wallet-device-bar"><span>{platform==='apple'?'Wallet':'Google Wallet'}</span><span>•••</span></div><div className="preview-card wallet-pass" style={{...customerBackground(design),borderTop:`7px solid ${color}`}}>{face==='front'?<><div className="card-head"><div>{business.logoUrl&&<img className="preview-logo" src={business.logoUrl} alt=""/>}<small>{title}</small><h3>{business.name}</h3><p>{subtitle}</p></div><b style={{color}}>{filled}/{target}</b></div><div className="preview-stamps">{stamps.map((_,i)=><div key={i} className={`preview-stamp ${shape} ${i<filled?'filled':''}`} style={i<filled?{background:color,borderColor:color}:{}}>{i<filled?(business.stampUrl?<img src={business.stampUrl} alt=""/>:<Scissors size={14}/>):i+1}</div>)}</div><div className="preview-reward"><Gift size={18} style={{color}}/><div><b>{reward}</b><span>Nächste Belohnung</span></div></div><div className="wallet-fake-qr" aria-hidden="true"><span/><span/><span/></div></>:<div className="wallet-back"><small>DEIN TREUEPROGRAMM</small><h3>{business.name}</h3><p>{subtitle}</p><div><b>Belohnung</b><span>{reward}</span></div><div><b>Fortschritt</b><span>{filled} von {target} Stempeln</span></div><div><b>Kundenkarte</b><span>Immer in Apple & Google Wallet dabei.</span></div></div>}</div></div>
    <div className="face-switch"><button type="button" className={face==='front'?'active':''} onClick={()=>setFace('front')}>Vorderseite</button><button type="button" className={face==='back'?'active':''} onClick={()=>setFace('back')}>Rückseite</button></div>
    <p className="wallet-live-note">Die Vorschau aktualisiert sich sofort beim Bearbeiten. Kunden sehen Änderungen erst nach dem Speichern.</p>
   </aside>
  </div>
 </section>
}
