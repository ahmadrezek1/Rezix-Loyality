'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {INDUSTRIES,industryDefaults} from '@/lib/industries';
import {ArrowLeft,ArrowRight,Building2,Gift,MapPin,Check,Loader2} from 'lucide-react';

type Values={
 industry:string;rewardTarget:string;rewardText:string;cardTitle:string;
 name:string;slug:string;locationName:string;street:string;postalCode:string;city:string;website:string;
 managerName:string;email:string;password:string;terms:boolean;
};
type Errors=Partial<Record<keyof Values,string>>;

type RegisterResponse={ok?:boolean;redirect?:string;error?:string;field?:keyof Values;message?:string};

const STEP_KEYS=['branche','programm','betrieb','standort','manager','abschluss'] as const;
const STEP_LABELS=['Branche','Treueprogramm','Betrieb','Standort','Manager','Abschluss'];

const serverMessages:Record<string,string>={
 limited:'Zu viele Versuche. Bitte warte kurz und versuche es erneut.',
 unavailable:'Diese Angabe wird bereits verwendet.',
 invalid:'Einige Angaben sind noch nicht korrekt. Prüfe bitte das markierte Feld.',
 setup:'Rezix wird gerade aktualisiert. Bitte versuche es in wenigen Minuten erneut.',
 server:'Die Registrierung konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.'
};
const fieldMessages:Record<string,string>={
 name:'Bitte gib einen Betriebsnamen ein.',
 slug:'Die Rezix-Adresse darf nur Kleinbuchstaben, Zahlen und einzelne Bindestriche enthalten.',
 managerName:'Bitte gib deinen Namen ein.',
 email:'Bitte gib eine gültige E-Mail-Adresse ein.',
 password:'Das Passwort muss zwischen 12 und 128 Zeichen lang sein.',
 rewardText:'Bitte gib eine Belohnung ein.',
 rewardTarget:'Die Stempelanzahl muss zwischen 2 und 30 liegen.',
 terms:'Bitte akzeptiere AGB und Datenschutzerklärung.',
 website:'Bitte gib eine vollständige Webadresse ein, z. B. https://example.at.',
 cardTitle:'Bitte gib einen Kartentitel ein.'
};

function slugify(value:string){return value.toLowerCase().trim().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-').slice(0,60)}
function validEmail(v:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validWebsite(v:string){if(!v)return true;try{const u=new URL(v);return u.protocol==='http:'||u.protocol==='https:'}catch{return false}}

export default function MultiBranchRegistration({error,errorField}:{error?:string;errorField?:string}){
 const search=useSearchParams();
 const queryStep=search.get('step')||'branche';
 const foundStep=STEP_KEYS.indexOf(queryStep as typeof STEP_KEYS[number]);
 const [step,setStepState]=useState(foundStep<0?0:foundStep);
 const [values,setValues]=useState<Values>({industry:'hair_beauty',rewardTarget:'10',rewardText:'',cardTitle:'',name:'',slug:'',locationName:'',street:'',postalCode:'',city:'',website:'',managerName:'',email:'',password:'',terms:false});
 const [errors,setErrors]=useState<Errors>({});
 const [submitError,setSubmitError]=useState(error?serverMessages[error]||serverMessages.invalid:'');
 const [submitting,setSubmitting]=useState(false);
 const defaults=useMemo(()=>industryDefaults(values.industry),[values.industry]);

 useEffect(()=>{setValues(v=>({...v,rewardTarget:v.rewardTarget||String(defaults.target),rewardText:v.rewardText||defaults.reward,cardTitle:v.cardTitle||defaults.title}))},[defaults]);
 useEffect(()=>{if(!errorField)return;setErrors(e=>({...e,[errorField]:fieldMessages[errorField]||serverMessages[error||'invalid']}));const idx=fieldStep(errorField);if(idx!==null)setStep(idx)},[]); // eslint-disable-line react-hooks/exhaustive-deps

 // Change wizard steps locally. router.replace caused a network navigation on every click and made the form feel slow.
 function setStep(next:number){
  const safe=Math.max(0,Math.min(STEP_KEYS.length-1,next));
  setStepState(safe);setSubmitError('');
  if(typeof window!=='undefined'){
   const url=new URL(window.location.href);url.searchParams.set('step',STEP_KEYS[safe]);url.searchParams.delete('error');url.searchParams.delete('field');
   window.history.replaceState(window.history.state,'',url.pathname+url.search);
   window.scrollTo({top:0,behavior:'smooth'});
  }
 }
 function update<K extends keyof Values>(key:K,value:Values[K]){setValues(v=>({...v,[key]:value}));setErrors(e=>{const n={...e};delete n[key];return n});setSubmitError('')}
 function fieldStep(field:string){if(field==='rewardText'||field==='rewardTarget'||field==='cardTitle')return 1;if(field==='name'||field==='slug')return 2;if(['locationName','street','postalCode','city','website'].includes(field))return 3;if(['managerName','email','password'].includes(field))return 4;if(field==='terms')return 5;return null}
 function errorsFor(current:number){const e:Errors={};
  if(current===1){const target=Number(values.rewardTarget);if(!Number.isInteger(target)||target<2||target>30)e.rewardTarget=fieldMessages.rewardTarget;if(!values.rewardText.trim()||values.rewardText.trim().length>160)e.rewardText=fieldMessages.rewardText;if(!values.cardTitle.trim()||values.cardTitle.trim().length>80)e.cardTitle=fieldMessages.cardTitle}
  if(current===2){if(!values.name.trim()||values.name.trim().length>120)e.name=fieldMessages.name;if(!values.slug||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug))e.slug=fieldMessages.slug}
  if(current===3&&!validWebsite(values.website))e.website=fieldMessages.website;
  if(current===4){if(!values.managerName.trim()||values.managerName.trim().length>100)e.managerName=fieldMessages.managerName;if(!validEmail(values.email)||values.email.length>160)e.email=fieldMessages.email;if(values.password.length<12||values.password.length>128)e.password=fieldMessages.password}
  if(current===5&&!values.terms)e.terms=fieldMessages.terms;
  return e;
 }
 function validate(current=step){const e=errorsFor(current);setErrors(e);return Object.keys(e).length===0}
 function validateAll(){const merged:Errors={};for(let i=0;i<STEP_KEYS.length;i++)Object.assign(merged,errorsFor(i));setErrors(merged);const first=Object.keys(merged)[0];if(first){const idx=fieldStep(first);if(idx!==null)setStep(idx);return false}return true}
 function next(){if(validate())setStep(step+1)}
 async function onSubmit(ev:FormEvent<HTMLFormElement>){
  ev.preventDefault();if(submitting||!validateAll())return;
  setSubmitting(true);setSubmitError('');
  try{
   const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),20000);
   const response=await fetch('/api/manager/register',{method:'POST',body:new FormData(ev.currentTarget),headers:{'accept':'application/json','x-rezix-client':'wizard'},signal:controller.signal});
   window.clearTimeout(timer);
   const data=(await response.json().catch(()=>({error:'server'}))) as RegisterResponse;
   if(response.ok&&data.ok&&data.redirect){window.location.assign(data.redirect);return}
   const code=data.error||'server';const message=data.message||serverMessages[code]||serverMessages.server;
   if(data.field){setErrors(e=>({...e,[data.field!]:fieldMessages[data.field!]||message}));const idx=fieldStep(data.field);if(idx!==null)setStep(idx)}
   setSubmitError(message);
  }catch(err){setSubmitError(err instanceof DOMException&&err.name==='AbortError'?'Die Verbindung dauert zu lange. Bitte prüfe dein Internet und versuche es erneut.':serverMessages.server)}finally{setSubmitting(false)}
 }
 const inputClass=(key:keyof Values)=>errors[key]?'field-error':'';
 const err=(key:keyof Values)=>errors[key]?<span className="field-message" role="alert">{errors[key]}</span>:null;

 return <div className="onboarding-shell onboarding-paged">
  <div className="onboarding-progress" aria-label={`Schritt ${step+1} von ${STEP_KEYS.length}`}>{STEP_LABELS.map((label,i)=><div key={label} className={`onboarding-step ${i<=step?'active':''}`}><span>{i<step?<Check size={14}/>:i+1}</span><b>{label}</b></div>)}</div>
  <form className="join-card onboarding-card onboarding-page-card" method="post" action="/api/manager/register" onSubmit={onSubmit} noValidate>
   <input type="hidden" name="industry" value={values.industry}/><input type="hidden" name="programType" value="stamps"/>
   <input type="hidden" name="rewardTarget" value={values.rewardTarget}/><input type="hidden" name="rewardText" value={values.rewardText}/><input type="hidden" name="cardTitle" value={values.cardTitle}/>
   <input type="hidden" name="name" value={values.name}/><input type="hidden" name="slug" value={values.slug}/><input type="hidden" name="locationName" value={values.locationName}/><input type="hidden" name="street" value={values.street}/><input type="hidden" name="postalCode" value={values.postalCode}/><input type="hidden" name="city" value={values.city}/><input type="hidden" name="website" value={values.website}/>
   <input type="hidden" name="managerName" value={values.managerName}/><input type="hidden" name="email" value={values.email}/><input type="hidden" name="password" value={values.password}/>
   {submitError&&<div className="alert registration-summary" role="alert">{submitError}</div>}

   {step===0&&<div className="onboarding-pane"><span className="eyebrow">SCHRITT 1 VON 6</span><h1>Welche Branche passt zu deinem Betrieb?</h1><p>Wähle deine Branche. Rezix passt Empfehlungen automatisch an.</p><div className="industry-grid compact-industries">{INDUSTRIES.map(([id,label])=><button type="button" key={id} onClick={()=>update('industry',id)} className={`industry-option ${values.industry===id?'selected':''}`}><Building2 size={19}/><span>{label}</span></button>)}</div></div>}

   {step===1&&<div className="onboarding-pane"><span className="eyebrow">SCHRITT 2 VON 6</span><h1>Dein Treueprogramm</h1><div className="choice-card selected"><Gift/><div><b>Stempelkarte</b><span>Ein Besuch = ein Stempel. Bei voller Karte wird die Belohnung freigeschaltet.</span></div></div><div className="registration-two-col"><div><label htmlFor="rewardTarget">Stempel bis zur Belohnung</label><input id="rewardTarget" className={inputClass('rewardTarget')} type="number" min="2" max="30" value={values.rewardTarget} onChange={e=>update('rewardTarget',e.target.value)}/>{err('rewardTarget')}</div><div><label htmlFor="cardTitle">Kartentitel</label><input id="cardTitle" className={inputClass('cardTitle')} maxLength={80} value={values.cardTitle} onChange={e=>update('cardTitle',e.target.value)}/>{err('cardTitle')}</div></div><label htmlFor="rewardText">Belohnung</label><input id="rewardText" className={inputClass('rewardText')} maxLength={160} value={values.rewardText} onChange={e=>update('rewardText',e.target.value)}/>{err('rewardText')}</div>}

   {step===2&&<div className="onboarding-pane"><span className="eyebrow">SCHRITT 3 VON 6</span><h1>Dein Betrieb</h1><p>So erscheint dein Betrieb bei deinen Kunden.</p><label htmlFor="name">Betriebsname</label><input id="name" className={inputClass('name')} maxLength={120} autoComplete="organization" value={values.name} onChange={e=>{const shouldUpdateSlug=!values.slug||values.slug===slugify(values.name);update('name',e.target.value);if(shouldUpdateSlug)update('slug',slugify(e.target.value))}}/>{err('name')}<label htmlFor="slug">Rezix-Adresse</label><div className="slug-input"><span>rezix.at/s/</span><input id="slug" className={inputClass('slug')} maxLength={60} value={values.slug} onChange={e=>update('slug',slugify(e.target.value))} placeholder="mein-betrieb"/></div>{err('slug')}<small>Nur Kleinbuchstaben, Zahlen und Bindestriche. Wir korrigieren die Eingabe automatisch.</small></div>}

   {step===3&&<div className="onboarding-pane compact-location-pane"><span className="eyebrow">SCHRITT 4 VON 6</span><h1>Dein erster Standort</h1><p>Optional zum Start. Du kannst diese Angaben später ergänzen.</p><div className="registration-two-col"><div><label htmlFor="locationName">Standortname</label><input id="locationName" maxLength={120} value={values.locationName} onChange={e=>update('locationName',e.target.value)} placeholder="z. B. Hauptfiliale Wien"/></div><div><label htmlFor="street">Straße & Hausnummer</label><input id="street" maxLength={160} value={values.street} onChange={e=>update('street',e.target.value)}/></div></div><div className="location-grid"><div><label htmlFor="postalCode">PLZ</label><input id="postalCode" maxLength={20} value={values.postalCode} onChange={e=>update('postalCode',e.target.value)}/></div><div><label htmlFor="city">Ort</label><input id="city" maxLength={100} value={values.city} onChange={e=>update('city',e.target.value)}/></div><div><label htmlFor="website">Website (optional)</label><input id="website" className={inputClass('website')} type="url" value={values.website} onChange={e=>update('website',e.target.value)} placeholder="https://example.at"/>{err('website')}</div></div><div className="onboarding-tip"><MapPin size={18}/> Diese Daten kannst du später jederzeit ändern.</div></div>}

   {step===4&&<div className="onboarding-pane"><span className="eyebrow">SCHRITT 5 VON 6</span><h1>Manager-Zugang</h1><p>Mit diesem Zugang verwaltest du Betrieb, Mitarbeiter und Treueprogramm.</p><label htmlFor="managerName">Dein Name</label><input id="managerName" className={inputClass('managerName')} maxLength={100} autoComplete="name" value={values.managerName} onChange={e=>update('managerName',e.target.value)}/>{err('managerName')}<div className="registration-two-col"><div><label htmlFor="email">E-Mail-Adresse</label><input id="email" className={inputClass('email')} type="email" maxLength={160} autoComplete="email" value={values.email} onChange={e=>update('email',e.target.value.trim())}/>{err('email')}</div><div><label htmlFor="password">Passwort</label><input id="password" className={inputClass('password')} type="password" minLength={12} maxLength={128} autoComplete="new-password" value={values.password} onChange={e=>update('password',e.target.value)}/>{err('password')}<small className={values.password.length>=12?'valid-hint':''}>{values.password.length}/12 Zeichen mindestens</small></div></div></div>}

   {step===5&&<div className="onboarding-pane completion-pane"><span className="eyebrow">SCHRITT 6 VON 6</span><h1>Fast fertig.</h1><p>Prüfe kurz deine Angaben und starte deinen Rezix-Betrieb.</p><div className="registration-review"><div><span>Betrieb</span><b>{values.name||'–'}</b></div><div><span>Rezix-Adresse</span><b>/s/{values.slug||'–'}</b></div><div><span>Treuekarte</span><b>{values.rewardTarget} Stempel · {values.rewardText||'–'}</b></div><div><span>Manager</span><b>{values.email||'–'}</b></div></div><label className={`checkline ${errors.terms?'checkline-error':''}`}><input type="checkbox" name="terms" checked={values.terms} onChange={e=>update('terms',e.target.checked)}/><span>Ich akzeptiere die <Link href="/agb" target="_blank">AGB</Link> und habe die <Link href="/datenschutz" target="_blank">Datenschutzerklärung</Link> gelesen.</span></label>{err('terms')}</div>}

   <div className="onboarding-actions">{step>0?<button type="button" className="secondary" disabled={submitting} onClick={()=>setStep(step-1)}><ArrowLeft size={16}/> Zurück</button>:<span/>}<span className="step-counter">{step+1}/{STEP_KEYS.length}</span>{step<5?<button type="button" className="gold" onClick={next}>Weiter <ArrowRight size={16}/></button>:<button className="gold" type="submit" disabled={submitting}>{submitting?<><Loader2 className="spin" size={16}/> Wird erstellt…</>:<>Kostenlos starten <ArrowRight size={16}/></>}</button>}</div>
  </form>
 </div>
}
