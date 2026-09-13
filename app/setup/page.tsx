import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function LegacySetup(){await requireAdmin();redirect('/admin')}
