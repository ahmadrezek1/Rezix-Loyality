'use client';
import React,{ useEffect,useRef,useState } from 'react';
import { Camera,CameraOff,Keyboard,Plus,ScanLine,CheckCircle2,AlertCircle,Gift,RotateCcw } from 'lucide-react';

type SelectedCustomer={name:string;code:string;stamps:number;rewardsRedeemed?:number};

export default function FriseurConsole({mode="scan"}:{mode?:"scan"|"manual"}){
 const [code,setCode]=useState('');
 const [customer,setCustomer]=useState<SelectedCustomer|null>(null);
 const [target,setTarget]=useState(0);
 const [rewardText,setRewardText]=useState('Belohnung');
 const [rewardReady,setRewardReady]=useState(false);
 const [msg,setMsg]=useState('');
 const [error,setError]=useState('');
 const [cameraOn,setCameraOn]=useState(false);
 const [cameraBusy,setCameraBusy]=useState(false);
 const [busy,setBusy]=useState(false);
 const pendingOperation=useRef<{key:string;code:string;operation:string}|null>(null);
 const actionLock=useRef(false);
 const cameraGeneration=useRef(0);
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const controlsRef=useRef<{stop:()=>void}|null>(null);

 function normalizeCustomerCode(value:string){
  const text=String(value||'').trim().toUpperCase();
  const match=text.match(/RZX-[A-Z0-9]{8}/);
  return match?.[0]||'';
 }
 function stopCamera(){
  cameraGeneration.current++;
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

 async function loadCustomer(rawCode:string){
  const normalized=normalizeCustomerCode(rawCode);
  if(!normalized){setError('Bitte einen gültigen Kundencode eingeben oder QR-Code scannen.');return;}
  setBusy(true);setError('');setMsg('');
  try{
   const r=await fetch('/api/friseur/customer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:normalized})});
   const j=await r.json();
   if(!r.ok){setCustomer(null);setError(j.error||'Kunde konnte nicht geladen werden.');return;}
   setCode(normalized);setCustomer(j.customer);setTarget(j.target);setRewardText(j.rewardText||'Belohnung');setRewardReady(!!j.rewardReady);
   setMsg(j.rewardReady?'Belohnung ist bereit und kann eingelöst werden.':'Kunde wurde geladen.');
  }catch{setError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');}finally{setBusy(false)}
 }

 async function startCamera(){
  setError('');setMsg('');
  if(cameraOn){stopCamera();return;}
  if(!navigator.mediaDevices?.getUserMedia){
   setError('Dieser Browser unterstützt keinen Kamerazugriff. Bitte den Kundencode manuell eingeben.');
   return;
  }
  if(cameraBusy)return;
  const generation=++cameraGeneration.current;let detectedOnce=false;
  setCameraBusy(true);
  try{
   const { BrowserQRCodeReader }=await import('@zxing/browser');
   const reader=new BrowserQRCodeReader();
   if(!videoRef.current)throw new Error('Video nicht verfügbar');
   const controls=await reader.decodeFromConstraints(
    {video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},
    videoRef.current,
    async(result)=>{
     if(!result||detectedOnce||generation!==cameraGeneration.current)return;
     const detected=normalizeCustomerCode(result.getText());
     if(!detected)return;
     detectedOnce=true;
     setCode(detected);
     stopCamera();
     await loadCustomer(detected);
    }
   );
   if(generation!==cameraGeneration.current){controls.stop();return;}
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

 async function mutate(operation:'stamp'|'redeem'){
  if(actionLock.current)return;
  const normalized=normalizeCustomerCode(code);if(!normalized||!customer)return;
  actionLock.current=true;setBusy(true);setMsg('');setError('');
  if(!pendingOperation.current||pendingOperation.current.code!==normalized||pendingOperation.current.operation!==operation)pendingOperation.current={key:crypto.randomUUID(),code:normalized,operation};
  try{
   const r=await fetch(operation==='stamp'?'/api/stamp':'/api/reward/redeem',{method:'POST',headers:{'content-type':'application/json','idempotency-key':pendingOperation.current.key},body:JSON.stringify({code:normalized})});
   const j=await r.json();
   if(!r.ok){if(r.status<500){pendingOperation.current=null;}setError(j.error||'Vorgang fehlgeschlagen.');if(r.status===409){setCustomer(null);setRewardReady(false);}return;}
   pendingOperation.current=null;setCustomer(j.customer);setTarget(j.target);setRewardText(j.rewardText);setRewardReady(j.rewardReady);
   setMsg(operation==='redeem'?'Belohnung eingelöst. Deine neue Stempelkarte wurde gestartet.':'Stempel wurde hinzugefügt.');
  }catch{setError('Verbindung unterbrochen. Bitte dieselbe Aktion erneut versuchen. Sie wird nur einmal verbucht.');}
  finally{actionLock.current=false;setBusy(false);}
 }
 return <div className="barber-grid">
  <section className="scanner">
   <ScanLine size={50}/><h2>{mode==='scan'?'Kunden erfassen':'Kundenkarte suchen'}</h2><p>{mode==='scan'?'QR-Code mit der Kamera scannen oder den Kundencode manuell eingeben.':'Gib den Kundencode ein, um die Treuekarte zu öffnen.'}</p>
   {mode==='scan'&&<><div className="scan-tabs">
    <button type="button" className={cameraOn?'gold':'secondary'} onClick={startCamera} disabled={cameraBusy||busy||!!pendingOperation.current}>{cameraOn?<CameraOff size={17}/>:<Camera size={17}/>} {cameraBusy?'Kamera wird geöffnet…':cameraOn?'Kamera schließen':'QR-Code scannen'}</button>
    <span><Keyboard size={16}/> Manuelle Eingabe</span>
   </div>
   <div className={`camera-box ${cameraOn?'active':''}`}>
    <video ref={videoRef} muted playsInline autoPlay/>
    <div className="camera-frame"><span/><span/><span/><span/></div>
    {!cameraOn&&<div className="camera-placeholder"><Camera size={38}/><b>Kamera öffnen</b><small>Die Rückkamera wird verwendet. Beim ersten Mal fragt der Browser nach der Berechtigung.</small></div>}
   </div>
   </>}
   <input disabled={busy||!!pendingOperation.current} aria-label="Kundencode" className="code-input" value={code} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setCode(e.target.value.toUpperCase());setCustomer(null);setRewardReady(false)}} placeholder="RZX-XXXXXXXX" autoCapitalize="characters"/>
   <button className="secondary full" onClick={()=>loadCustomer(code)} disabled={!code.trim()||busy||!!pendingOperation.current}><ScanLine size={18}/> Kunde laden</button>
   {customer&&!rewardReady&&<button className="gold full" onClick={()=>mutate('stamp')} disabled={busy}><Plus size={18}/> Stempel hinzufügen</button>}
   {customer&&rewardReady&&<button className="reward-redeem-button full" onClick={()=>mutate('redeem')} disabled={busy}><Gift size={18}/> Belohnung einlösen</button>}
   {msg&&<div className="inline-msg success-inline"><CheckCircle2 size={16}/>{msg}</div>}
   {error&&<div className="inline-msg error-inline"><AlertCircle size={16}/>{error}</div>}
  </section>
  <section className="customer-result empty-state">{customer?<>
   <div className="avatar">{customer.name.slice(0,2).toUpperCase()}</div><div className="person"><h2>{customer.name}</h2><p>{customer.code}</p></div>
   <div className="score">{customer.stamps}/{target}</div>
   {rewardReady?<div className="reward-ready-card"><Gift size={28}/><div><b>Belohnung bereit</b><span>{rewardText}</span></div></div>:<p>Noch {Math.max(0,target-customer.stamps)} Stempel bis zur Belohnung.</p>}
   <small>Eingelöste Belohnungen: {customer.rewardsRedeemed||0}</small>
  </>:<><h2>Kein Kunde ausgewählt</h2><p>Nach dem Scan eines gültigen Kundencodes erscheinen hier die Daten dieses Kunden.</p></>}</section>
 </div>
}
