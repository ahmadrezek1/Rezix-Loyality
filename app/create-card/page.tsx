import Link from 'next/link';
import PublicCardBuilder from '@/components/PublicCardBuilder';
export default function CreateCard(){return <main><header className="topbar"><Link className="brand" href="/" aria-label="Rezix Startseite"><img src="/rezix-header-logo.svg" alt="Rezix"/></Link><nav><Link className="secondary" href="/manager/login">Anmelden</Link></nav></header><div className="shell"><PublicCardBuilder/></div></main>;}
