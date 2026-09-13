import { redirect } from 'next/navigation';
import { currentPendingAuth } from '@/lib/auth';
import { beginMfaEnrollment,decryptSecret,getMfa } from '@/lib/auth-store';
import { generateTotpSecret,otpauthUri } from '@/lib/totp';
import MfaQr from '@/components/MfaQr';
export const dynamic='force-dynamic';
export default async function MfaSetup({searchParams}:{searchParams:Promise<{error?:string}>}){
 const p=await currentPendingAuth();if(!p||!['admin','manager'].includes(p.role))redirect('/');
 let row=await getMfa(p.role,p.sub);let secret:string;
 if(row?.enabled)redirect('/auth/2fa/challenge');
 if(row?.secret_enc)secret=decryptSecret(row.secret_enc);else{secret=generateTotpSecret();await beginMfaEnrollment(p.role,p.sub,secret)}
 const q=await searchParams;const label=p.role==='admin'?(process.env.REZIX_ADMIN_EMAIL||p.sub):(p.name||p.sub);const uri=otpauthUri(secret,label);
 return <main><section className="join"><form className="join-card" method="post" action="/api/auth/2fa/setup"><img src="/rezix-logo.svg" alt="Rezix"/><span className="eyebrow">ZWEI-FAKTOR-SCHUTZ</span><h1>Authenticator einrichten</h1><p>Scanne den QR-Code mit Google Authenticator, Microsoft Authenticator, 1Password oder einer kompatiblen App.</p>{q.error&&<div className="alert">Der Code ist nicht korrekt. Bitte einen aktuellen 6-stelligen Code eingeben.</div>}<MfaQr value={uri}/><div className="code-box"><small>Manueller Schlüssel</small><b>{secret}</b></div><label>6-stelliger Code</label><input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus/><button className="gold full" type="submit">2FA aktivieren</button><small>2FA ist für Admin und Manager verpflichtend. Nach der Einrichtung erhältst du Wiederherstellungscodes.</small></form></section></main>
}
