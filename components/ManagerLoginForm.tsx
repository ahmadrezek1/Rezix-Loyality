'use client';
import {useState} from 'react';
import {useFormStatus} from 'react-dom';
import Link from 'next/link';
import {ArrowRight,Eye,EyeOff,LockKeyhole,Loader2} from 'lucide-react';
function Submit(){const {pending}=useFormStatus();return <button className="auth-primary" disabled={pending}>{pending?<><Loader2 size={18} className="spin"/>Anmeldung läuft…</>:<>Anmelden <ArrowRight size={18}/></>}</button>;}
export default function ManagerLoginForm(){
 const [visible,setVisible]=useState(false);
 return <form className="auth-form" action="/api/manager/login" method="post">
  <div className="auth-field"><label htmlFor="login-email">E-Mail-Adresse</label><input id="login-email" name="email" type="email" autoComplete="username" placeholder="du@dein-betrieb.at" maxLength={160} required/></div>
  <div className="auth-field"><div className="auth-label-row"><label htmlFor="login-password">Passwort</label><Link href="/auth/forgot?role=manager">Passwort vergessen?</Link></div><div className="password-control"><input id="login-password" name="password" type={visible?'text':'password'} autoComplete="current-password" maxLength={128} required/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?'Passwort verbergen':'Passwort anzeigen'} aria-pressed={visible}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>
  <Submit/><p className="auth-secure-note"><LockKeyhole size={14}/> Dein sicherer Zugang zu Rezix</p>
 </form>;
}
