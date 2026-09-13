import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { salonManagers } from '@/lib/admin-business';
import { canIssueAuthToken,createOneTimeToken } from '@/lib/auth-store';
import { appBaseUrl,sendAuthEmail } from '@/lib/mailer';
import { sameOrigin,audit } from '@/lib/security';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const session=await currentSession();if(!session||session.role!=='admin')return NextResponse.json({error:'Unauthorized'},{status:401});
 const f=await req.formData(),businessId=String(f.get('businessId')||''),managerId=String(f.get('managerId')||'');
 const manager=(await salonManagers(businessId)).find(m=>m.id===managerId&&m.active);
 if(!manager)return NextResponse.json({error:'Manager nicht gefunden'},{status:404});
 const purpose=manager.email_verified_at?'password_reset':'email_verify';
 if(!await canIssueAuthToken(manager.id,purpose))return NextResponse.redirect(new URL('/admin/salons?reset=limited',req.url),303);
 const token=await createOneTimeToken(manager.id,'manager',purpose,30);
 const url=`${appBaseUrl(req)}${purpose==='password_reset'?'/auth/reset':'/api/auth/verify-email'}?token=${encodeURIComponent(token)}`;
 const sent=await sendAuthEmail({to:manager.email,subject:'Rezix – Manager-Zugang',html:`<p>Die Administration hat einen Zugangslink angefordert. Der Link ist 30 Minuten gültig.</p><p><a href="${url}">${purpose==='password_reset'?'Passwort zurücksetzen':'E-Mail bestätigen'}</a></p>`});
 await audit({session,businessId,action:'manager.access.requested',targetType:'manager',targetId:manager.id,metadata:{sent}});
 return NextResponse.redirect(new URL('/admin/salons?reset='+(sent?'sent':'failed'),req.url),303);
}
