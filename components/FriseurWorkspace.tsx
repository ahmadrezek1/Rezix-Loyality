import Link from 'next/link';
import { requireFriseur } from '@/lib/auth';
import { getBusinessById } from '@/lib/store';
import FriseurConsole from '@/components/FriseurConsole';
import { billingOperational } from '@/lib/billing';
import DashboardShell from '@/components/DashboardShell';
import { ScanLine, ShieldCheck, Sparkles } from 'lucide-react';

export default async function FriseurPage({view="overview"}:{view?:string}){
 const s=await requireFriseur();
 const b=await getBusinessById(s.businessId!);
 return <DashboardShell role="friseur" name={s.name} businessName={b?.name||'Rezix'} logoUrl={b?.logoUrl}>
  <section id="overview" className="dashboard-hero"><div><span className="eyebrow">FRISEURBEREICH</span><h1>{view==='overview'?`Hallo, ${s.name||'Team'}.`:view==='scan'?'Kunden scannen':'Kundenkarte öffnen'}</h1><p>Kunden schnell erfassen, Treuekarte öffnen und einen echten Besuch protokollieren.</p></div><div className="role-status"><ShieldCheck size={17}/> Geschützter Bereich</div></section>
  <div className="friseur-highlights"><div><ScanLine/><span><b>QR-Scan</b> Kamera oder Code</span></div><div><Sparkles/><span><b>Schnell</b> Stempel in Sekunden</span></div></div>
  {view!=='overview'&&(<section id="scan" className="dashboard-section friseur-console-wrap">{b&&!billingOperational(b)?<div className="panel"><div className="empty-block"><b>Salon-Tarif nicht aktiv</b><span>Bitte den Manager kontaktieren. Stempel- und Kundenaktionen sind bis zur Reaktivierung gesperrt.</span></div></div>:<FriseurConsole mode={view==='customer'?'manual':'scan'} key={view}/>}</section>)}
  {view==='overview'&&<div className="workspace-grid"><Link className="workspace-card" href="/friseur/scan"><ScanLine/><h2>Kunden scannen</h2><p>QR-Code erfassen und Besuche stempeln.</p><span className="workspace-card-action">Scanner öffnen →</span></Link><Link className="workspace-card" href="/friseur/customer"><Sparkles/><h2>Kundenkarte öffnen</h2><p>Kunden per Code finden und Belohnungen einlösen.</p><span className="workspace-card-action">Kunde suchen →</span></Link></div>}
 </DashboardShell>
}
