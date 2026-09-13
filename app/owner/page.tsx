import { currentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function LegacyOwner(){
  const s=await currentSession();
  if(s?.role==='admin') redirect('/admin');
  if(s?.role==='manager') redirect('/manager');
  if(s?.role==='friseur') redirect('/friseur');
  redirect('/admin/login');
}
