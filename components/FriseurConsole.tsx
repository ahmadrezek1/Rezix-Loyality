'use client';
import React,{ useEffect,useRef,useState } from 'react';
import { Camera,CameraOff,Keyboard,Plus,ScanLine,CheckCircle2,AlertCircle } from 'lucide-react';

export default function FriseurConsole(){
 const [code,setCode]=useState('');
 const [customer,setCustomer]=useState<{name:string;code:string;stamps:number}|null>(null);
 const [target,setTarget]=useState(0);
 const [msg,setMsg]=useState('');
 const [error,setError]=useState('');
 const [cameraOn,setCameraOn]=useState(false);
 const [cameraBusy,setCameraBusy]=useState(false);
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const controlsRef=useRef<{stop:()=>void}|null>(null);

 function normalizeCustomerCode(value:string){
  const text=String(value||'').trim().toUpperCase();
  const match=text.match(/RZX-[A-Z0-9]{8}/);
  return match?.[0]||'';
 }
 function stopCamera(){
  try{controlsRef.current?.stop()}catch{}
  controlsRef.current=null;
  if(videoRef.current){
   const stream=videoRef.current.srcObject as MediaStream|null;
   stream?.getTracks().forEach(track=>track.stop());
   videoRef.current.srcObject=null;
  }
  setCameraOn(false);
 }
 useEffect(()=>()=>stopCamera(),[]);

 async function startCamera(){
  setError('');setMsg('');
  if(cameraOn){stopCamera();return;}
  if(!navigator.mediaDevices?.getUserMedia){
   setError('Dieser Browser unterstützt keinen Kamerazugriff. Bitte den Kundencode manuell eingeben.');
   return;
  }
  setCameraBusy(true);
  try{
   const { BrowserQRCodeReader }=await import('@zxing/browser');
   const reader=new BrowserQRCodeReader();
   if(!videoRef.current)throw new Error('Video nicht verfügbar');
   const controls=await reader.decodeFromConstraints(
    {video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},
    videoRef.current,
    (result)=>{
     if(!result)return;
     const detected=normalizeCustomerCode(result.getText());
     if(!detected)return;
     setCode(detected);
     setMsg('QR-Code erkannt. Kundencode wurde übernommen.');
     stopCamera();
    }
   );
   controlsRef.current=controls;
   setCameraOn(true);
  }catch(e:any){
   const name=e?.name||'';
   if(name==='NotAllowedError'||name==='PermissionDeniedError'){
    setError('Kamerazugriff wurde abgelehnt. Erlaube die Kamera für loyalty.rezix.at in den Browser-Einstellungen und versuche es erneut.');
   }else if(name==='NotFoundError'||name==='DevicesNotFoundError'){
    setError('Keine Kamera gefunden. Nutze alternativ die manuelle Eingabe.');
   }else{
    setError('QR-Scanner konnte nicht gestartet werden. Bitte Seite neu laden oder den Kundencode manuell eingeben.');
   }
   stopCamera();
  }finally{setCameraBusy(false)}
 }

 async function add(){
  setMsg('');setError('');
  const normalized=normalizeCustomerCode(code);
  if(!normalized){setError('Bitte einen gültigen Kundencode eingeben oder QR-Code scannen.');return;}
  const r=await fetch('/api/stamp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:normalized})});
  const j=await r.json();
  if(!r.ok){setError(j.error||'Fehler');return;}
  setCustomer(j.customer);setTarget(j.target);setCode(normalized);setMsg('Stempel wurde erfolgreich hinzugefügt.');
 }
 return <div className="barber-grid">
  <section className="scanner">
   <ScanLine size={50}/><h2>Kunden erfassen</h2><p>QR-Code mit der Kamera scannen oder den Kundencode manuell eingeben.</p>
   <div className="scan-tabs">
    <button type="button" className={cameraOn?'gold':'secondary'} onClick={startCamera} disabled={cameraBusy}>{cameraOn?<CameraOff size={17}/>:<Camera size={17}/>} {cameraBusy?'Kamera wird geöffnet…':cameraOn?'Kamera schließen':'QR-Code scannen'}</button>
    <span><Keyboard size={16}/> Manuelle Eingabe</span>
   </div>
   <div className={`camera-box ${cameraOn?'active':''}`}>
    <video ref={videoRef} muted playsInline autoPlay/>
    <div className="camera-frame"><span/><span/><span/><span/></div>
    {!cameraOn&&<div className="camera-placeholder"><Camera size={38}/><b>Kamera öffnen</b><small>Die Rückkamera wird verwendet. Beim ersten Mal fragt der Browser nach der Berechtigung.</small></div>}
   </div>
   <input className="code-input" value={code} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setCode(e.target.value.toUpperCase())} placeholder="RZX-XXXXXXXX" autoCapitalize="characters"/>
   <button className="gold" onClick={add} disabled={!code.trim()}><Plus size={18}/> Stempel hinzufügen</button>
   {msg&&<div className="inline-msg success-inline"><CheckCircle2 size={16}/>{msg}</div>}
   {error&&<div className="inline-msg error-inline"><AlertCircle size={16}/>{error}</div>}
  </section>
  <section className="customer-result empty-state">{customer?<><div className="avatar">{customer.name.slice(0,2).toUpperCase()}</div><div className="person"><h2>{customer.name}</h2><p>{customer.code}</p></div><div className="score">{customer.stamps}/{target}</div><p>Der Besuch wurde protokolliert.</p></>:<><h2>Kein Kunde ausgewählt</h2><p>Nach dem Scan eines gültigen Kundencodes erscheinen hier die Daten dieses Kunden.</p></>}</section>
 </div>
}
