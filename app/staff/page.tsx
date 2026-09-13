import { currentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function LegacyStaff(){
  const s=await currentSession();
  if(s?.role==='friseur') redirect('/friseur');
  if(s?.role==='manager') redirect('/manager');
  if(s?.role==='admin') redirect('/admin');
  redirect('/friseur/login');
}
