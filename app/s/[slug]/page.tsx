import CustomerApp from '@/components/CustomerApp';
import { getBusinessBySlug } from '@/lib/store';
import { notFound } from 'next/navigation';
import { billingOperational } from '@/lib/billing';
export const dynamic='force-dynamic';
export default async function SalonPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const b=await getBusinessBySlug(slug);if(!b)notFound();if(!billingOperational(b))return <main><section className="join"><div className="join-card">{b.logoUrl&&<img src={b.logoUrl} alt={b.name}/>}<span className="eyebrow">REZIX LOYALTY</span><h1>{b.name}</h1><p>Das Loyalty-Programm ist derzeit vorübergehend nicht verfügbar. Bitte wende dich an den Salon.</p></div></section></main>;return <CustomerApp slug={slug} salon={{name:b.name,logoUrl:b.logoUrl}}/>}
