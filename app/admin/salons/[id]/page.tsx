import { requireAdmin } from '@/lib/auth';
import { getBusinessById } from '@/lib/store';
import { notFound } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';
import SalonAdministration from '@/components/SalonAdministration';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){const s=await requireAdmin();const b=await getBusinessById((await params).id);if(!b)notFound();return <DashboardShell role="admin" name={s.name}><div className="dashboard-hero"><div><span className="eyebrow">SALONVERWALTUNG</span><h1>{b.name}</h1></div><Link className="secondary" href="/admin/salons">Alle Salons</Link></div><SalonAdministration business={b}/></DashboardShell>}
