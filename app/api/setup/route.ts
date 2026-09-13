import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
export async function POST(req:Request){
  const s=await currentSession();
  if(!s||s.role!=='admin') return NextResponse.redirect(new URL('/admin/login',req.url),303);
  return NextResponse.redirect(new URL('/admin',req.url),303);
}
