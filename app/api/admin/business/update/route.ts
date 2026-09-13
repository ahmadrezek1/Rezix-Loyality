import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { updateSalon } from '@/lib/admin-business';
import { sameOrigin } from '@/lib/security';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const session=await currentSession();if(!session||session.role!=='admin')return NextResponse.json({error:'Unauthorized'},{status:401});
 const f=await req.formData();const businessId=String(f.get('businessId')||'');
 try{await updateSalon(session,businessId,String(f.get('action')||''),String(f.get('name')||'').trim(),String(f.get('plan')||''));return NextResponse.redirect(new URL('/admin/salons?saved=1',req.url),303);}
 catch(e){const reason=e instanceof Error&&e.message==='managed-subscription'?'managed':'invalid';return NextResponse.redirect(new URL('/admin/salons?updateError='+reason,req.url),303);}
}
