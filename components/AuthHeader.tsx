import Link from 'next/link';
export default function AuthHeader({register=false}:{register?:boolean}){
 return <header className="auth-header"><Link href="/" aria-label="Rezix Startseite" className="auth-wordmark"><img src="/rezix-loyalty-new.png" alt="Rezix Loyalty" width="220" height="70"/></Link><nav aria-label="Zugang"><span>{register?'Schon dabei?':'Neu bei Rezix?'}</span><Link href={register?'/manager/login':'/manager/register'} className="auth-header-link">{register?'Login':'Registrieren'}</Link></nav></header>;
}
