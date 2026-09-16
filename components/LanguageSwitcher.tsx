'use client';
import {useEffect,useState} from 'react';
type Lang='de'|'en'|'ar';
const labels:Record<Lang,string>={de:'DE',en:'EN',ar:'AR'};
export default function LanguageSwitcher(){
 const [lang,setLang]=useState<Lang>('de');
 useEffect(()=>{const saved=(localStorage.getItem('rezix_language')||'de') as Lang;apply(saved);setLang(saved)},[]);
 function apply(next:Lang){document.documentElement.lang=next;document.documentElement.dir=next==='ar'?'rtl':'ltr';localStorage.setItem('rezix_language',next);window.dispatchEvent(new CustomEvent('rezix-language',{detail:next}));}
 return <div className="language-switcher" aria-label="Sprache / Language / اللغة">{(['de','en','ar'] as Lang[]).map(v=><button type="button" key={v} className={lang===v?'active':''} onClick={()=>{setLang(v);apply(v)}}>{labels[v]}</button>)}</div>;
}
