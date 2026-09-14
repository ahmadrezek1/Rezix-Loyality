import Link from 'next/link';
import {CheckCircle2,Circle,Palette,MapPin,Users,QrCode,Gift} from 'lucide-react';
import {industryLabel} from '@/lib/industries';
import type {Business} from '@/lib/store';
export default function BusinessSetupChecklist({business,staffCount}:{business:Business;staffCount:number}){
 const items=[
  {done:business.industry!=='other',title:'Branche auswählen',text:industryLabel(business.industry),href:'/manager/settings',icon:Gift},
  {done:!!business.rewardText&&business.rewardTarget>=2,title:'Treueprogramm einrichten',text:`${business.rewardTarget} Stempel · ${business.rewardText}`,href:'/manager/loyalty',icon:Gift},
  {done:!!business.logoUrl,title:'Karte gestalten',text:business.logoUrl?'Logo und Kartendesign eingerichtet':'Logo, Farben und Kartenstil festlegen',href:'/manager/loyalty',icon:Palette},
  {done:!!business.city||!!business.street,title:'Standort vervollständigen',text:business.city||business.street||'Adresse und Standortdaten hinzufügen',href:'/manager/settings',icon:MapPin},
  {done:staffCount>0,title:'Mitarbeiter hinzufügen',text:staffCount?`${staffCount} Mitarbeiter aktiv`:'Ersten Mitarbeiterzugang anlegen',href:'/manager/friseure',icon:Users},
  {done:true,title:'QR-Aufsteller bereit',text:`Kundenlink: /s/${business.slug}`,href:`/s/${business.slug}`,icon:QrCode},
 ];
 const complete=items.filter(i=>i.done).length;
 return <section className="panel setup-checklist"><div className="panel-head"><div><span className="section-kicker">ERSTE SCHRITTE</span><h2>Rezix einrichten</h2><p className="muted">Wie bei einer professionellen Loyalty-Plattform: einmal einrichten, danach läuft dein Programm im Alltag.</p></div><div className="setup-score"><b>{complete}/{items.length}</b><span>erledigt</span></div></div><div className="setup-progress"><i style={{width:`${complete/items.length*100}%`}}/></div><div className="setup-list">{items.map(({done,title,text,href,icon:Icon})=><Link href={href} className="setup-row" key={title} target={href.startsWith('/s/')?'_blank':undefined}><span className={done?'setup-status done':'setup-status'}>{done?<CheckCircle2 size={20}/>:<Circle size={20}/>}</span><Icon size={20}/><div><b>{title}</b><span>{text}</span></div><span className="setup-arrow">›</span></Link>)}</div></section>
}
