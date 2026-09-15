import Image from 'next/image';
import { Check, Gift, MapPin, ShieldCheck, Store, Sparkles } from 'lucide-react';

const scenes=[
 {title:'Dein Betrieb. Dein Rezix.',text:'Wir richten dein Treueprogramm gemeinsam ein.',label:'Passend zu deiner Branche',icon:Sparkles},
 {title:'Ein guter Grund, wiederzukommen.',text:'Mach aus dem nächsten Besuch eine kleine Belohnung.',label:'Deine persönliche Belohnung',icon:Gift},
 {title:'Hier steht dein Name drauf.',text:'Deine Kunden erkennen dich auf ihrer Treuekarte wieder.',label:'Dein Name. Deine Kundenkarte.',icon:Store},
 {title:'Wo Kunden zu Stammkunden werden.',text:'Deinen Standort kannst du auch später ergänzen.',label:'Ein Zuhause für deinen Betrieb',icon:MapPin},
 {title:'Dein Zugang. Alles im Blick.',text:'Mit deinem Konto verwaltest du Kunden, Team und Karten.',label:'Dein persönlicher Zugang',icon:ShieldCheck},
 {title:'Bereit für mehr Wiedersehen.',text:'Nur noch deine Angaben prüfen. Dann kann es losgehen.',label:'Dein Rezix ist startklar',icon:Check},
];

export default function AuthMascot({step,login=false}:{step?:number;login?:boolean}){
 const scene=login?{title:'Schön, dass du wieder da bist.',text:'Dein Betrieb, dein Team und deine Kundenkarten an einem Ort.',label:'Mehr Wiedersehen. Weniger Papier.',icon:Store}:scenes[step??0];
 const Icon=scene.icon;
 return <aside className={`auth-companion ${login?'auth-companion-login':`auth-companion-step-${step??0}`}`} aria-label="Dein Rezix-Begleiter">
  <div className="auth-companion-copy"><span className="auth-kicker">REZIX LOYALTY</span><h2>{scene.title}</h2><p>{scene.text}</p></div>
  <div className="auth-mascot-stage" aria-hidden="true"><div className="auth-mascot-disc"/><Image className="auth-mascot-rabbit" src="/media/rezix-rabbit-peek.png" alt="" width={1254} height={1254} sizes="(max-width: 800px) 120px, 340px" priority/><div className="auth-mascot-note"><span><Icon size={22}/></span><b>{scene.label}</b></div></div>
 </aside>;
}
