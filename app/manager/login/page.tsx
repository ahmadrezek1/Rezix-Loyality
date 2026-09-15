import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import PinLogin from '@/components/PinLogin';
import AuthHeader from '@/components/AuthHeader';
import AuthMascot from '@/components/AuthMascot';

export default async function ManagerLogin({searchParams}:{searchParams:Promise<{error?:string;pinError?:string;blocked?:string;verify?:string;verified?:string}>}){
 const q=await searchParams;
 return <main className="rezix-auth"><AuthHeader/><div className="auth-login-layout"><AuthMascot login/><section className="auth-login-content" aria-labelledby="login-title"><div className="auth-form-heading"><span className="auth-kicker">DEIN MANAGER-KONTO</span><h1 id="login-title">Willkommen zurück.</h1><p>Melde dich an und mach aus Besuchen Wiedersehen.</p></div><PinLogin role="manager" error={q.pinError}/><form className="auth-form" method="post" action="/api/manager/login">
  {q.blocked&&<div className="alert" role="alert">Zu viele fehlgeschlagene Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.</div>}
  {q.error&&<div className="alert" role="alert">E-Mail oder Passwort ist falsch.</div>}
  {q.verify&&<div className="alert" role="alert">Bitte bestätige zuerst deine E-Mail-Adresse. Einen neuen Bestätigungscode kannst du unten anfordern.</div>}
  {q.verified&&<div className="success" role="status">E-Mail bestätigt. Du kannst dich jetzt anmelden.</div>}
  <div className="auth-field"><label htmlFor="login-email">E-Mail-Adresse</label><input id="login-email" type="email" name="email" placeholder="du@dein-betrieb.at" autoComplete="username" required/></div>
  <div className="auth-field"><div className="auth-label-row"><label htmlFor="login-password">Passwort</label><Link href="/auth/forgot?role=manager">Passwort vergessen?</Link></div><input id="login-password" type="password" name="password" placeholder="Dein Passwort" autoComplete="current-password" required/></div>
  <button className="auth-primary" type="submit">Login <ArrowRight size={18}/></button>
  <p className="auth-secure-note"><LockKeyhole size={15}/> Dein Zugang zu deinem Betrieb</p>
 </form><div className="auth-login-links"><Link href="/manager/verify">Bestätigungscode anfordern</Link><p>Noch kein Konto? <Link href="/manager/register">Jetzt registrieren</Link></p></div></section></div><footer className="auth-legal"><Link href="/datenschutz">Datenschutz</Link><Link href="/impressum">Impressum</Link></footer></main>;
}
