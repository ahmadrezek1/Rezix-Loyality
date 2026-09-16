'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, Scissors, CreditCard, Settings, Gift, LogOut, ScanLine, UserRoundSearch, Store, ShieldCheck } from 'lucide-react';

export type DashboardRole='admin'|'manager'|'friseur';

const adminItems=[
 {href:'/admin',label:'Übersicht',icon:Home},
 {href:'/admin/salons',label:'Betriebe',icon:Store},
 {href:'/admin/subscriptions',label:'Abonnements',icon:CreditCard},
 {href:'/admin/system',label:'Einstellungen',icon:ShieldCheck},
];
const managerItems=[
 {href:'/manager',label:'Übersicht',icon:Home},
 {href:'/manager/customers',label:'Kunden',icon:Users},
 {href:'/manager/friseure',label:'Mitarbeiter',icon:Scissors},
 {href:'/manager/loyalty',label:'Treueprogramm',icon:Gift},
 {href:'/manager/billing',label:'Tarif & Abrechnung',icon:CreditCard},
 {href:'/manager/settings',label:'Einstellungen',icon:Settings},
];
const friseurItems=[
 {href:'/friseur',label:'Übersicht',icon:Home},
 {href:'/friseur/scan',label:'Kunden scannen',icon:ScanLine},
 {href:'/friseur/customer',label:'Kundenkarte',icon:UserRoundSearch},
];

export default function DashboardShell({role,name,businessName,logoUrl,children}:{role:DashboardRole,name?:string|null,businessName?:string|null,logoUrl?:string|null,children:React.ReactNode}){
 const pathname=usePathname();
 const activeHref=(href:string)=>pathname===href||(href.endsWith('/salons')&&pathname.startsWith(href+'/'));
 const items=role==='admin'?adminItems:role==='manager'?managerItems:friseurItems;
 return <div className={`dashboard-app dashboard-${role}`}>
  <aside className="dashboard-sidebar">
   <div className="sidebar-brand">
    <img src="/rezix-logo.svg" alt="Rezix"/>
    <div><span>{role==='admin'?'ADMIN':role==='manager'?'MANAGER':'MITARBEITER'}</span></div>
   </div>
   <nav className="sidebar-nav" aria-label="Hauptnavigation">
    {items.map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={activeHref(href)?'page':undefined} title={label} className={`sidebar-link ${activeHref(href)?'active':''}`}><Icon size={19}/><span>{label}</span></Link>)}
   </nav>
   <div className="sidebar-bottom">{role!=='admin'&&<Link className="sidebar-link" href="/auth/quick-login"><ShieldCheck size={18}/><span>Schnell-Login einrichten</span></Link>}
    <div className="sidebar-profile">
     <div className="sidebar-avatar">{(name||role).slice(0,1).toUpperCase()}</div>
     <div><b>{name||role}</b><span>{businessName||'Rezix Loyalty'}</span></div>
    </div>
    <form method="post" action="/api/logout"><button type="submit" className="sidebar-logout"><LogOut size={18}/><span>Abmelden</span></button></form>
   </div>
  </aside>
  <div className="dashboard-main">
   <header className="dashboard-header">
    <div className="mobile-brand"><img src="/rezix-header-logo.svg" alt="Rezix"/><b>{businessName||'Rezix Loyalty'}</b></div>
    <div className="header-breadcrumb">{businessName||'Rezix Loyalty'} <span>/</span> <b>{items.find(item=>activeHref(item.href))?.label}</b></div><div className="header-spacer"/><form className="mobile-logout" method="post" action="/api/logout"><button className="secondary" aria-label="Abmelden"><LogOut size={18}/></button></form>
    <div className="header-role"><div className="sidebar-avatar small">{(name||role).slice(0,1).toUpperCase()}</div><div><b>{name||role}</b><span>{role==='admin'?'Admin':role==='manager'?'Manager':'Mitarbeiter'}</span></div></div>
   </header>
   <main className="dashboard-content">{children}</main>
  </div>
 </div>
}
