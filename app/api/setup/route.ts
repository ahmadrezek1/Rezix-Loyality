import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { getBusiness,saveBusiness } from '@/lib/store';
export async function POST(req:Request){
  const s=await currentSession(); if(!s||s.role!=='admin') return new NextResponse('Unauthorized',{status:401});
  if(await getBusiness()) return NextResponse.redirect(new URL('/owner',req.url),303);
  const form=await req.formData(); const name=String(form.get('name')||'').trim(); const rewardText=String(form.get('rewardText')||'').trim(); const rewardTarget=Math.max(2,Math.min(30,Number(form.get('rewardTarget')||10)));
  if(!name||!rewardText) return NextResponse.redirect(new URL('/setup?error=1',req.url),303);
  await saveBusiness({name,rewardTarget,rewardText});
  return NextResponse.redirect(new URL('/owner',req.url),303);
}
