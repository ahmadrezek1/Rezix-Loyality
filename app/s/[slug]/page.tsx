import CustomerApp from '@/components/CustomerApp';
import { getBusinessBySlug } from '@/lib/store';
import { notFound } from 'next/navigation';
import { billingOperational } from '@/lib/billing';
export const dynamic='force-dynamic';
export default async function SalonPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const b=await getBusinessBySlug(slug);if(!b)notFound();return <CustomerApp slug={slug} salon={{name:b.name,logoUrl:b.logoUrl}}/>}
