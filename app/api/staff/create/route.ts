import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { createStaff,staffEmailExists } from '@/lib/store';
export async function POST(req:Request){
  const s=await currentSession(); if(!s||s.role!=='admin') return new NextResponse('Unauthorized',{status:401});
  const form=await req.formData(); const name=String(form.get('name')||'').trim(); const email=String(form.get('email')||'').trim().toLowerCase(); const password=String(form.get('password')||''); const role=String(form.get('role')||'staff')==='manager'?'manager':'staff';
  if(!name||!email||password.length<8) return NextResponse.redirect(new URL('/owner?staffError=1',req.url),303);
  if(await staffEmailExists(email)) return NextResponse.redirect(new URL('/owner?staffExists=1',req.url),303);
  await createStaff({name,email,password,role});
  return NextResponse.redirect(new URL('/owner?staffAdded=1',req.url),303);
}
