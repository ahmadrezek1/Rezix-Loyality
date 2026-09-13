import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { database } from '@/lib/db';
import { getBusinessById,id } from '@/lib/store';
import { billingOperational,friseurLimitFor } from '@/lib/billing';
import { sameOrigin } from '@/lib/security';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const s=await currentSession();if(!s||s.role!=='manager'||!s.businessId)return NextResponse.json({error:'Unauthorized'},{status:401});
 const f=await req.formData(),staffId=String(f.get('staffId')||''),activate=f.get('action')==='activate';
 try{await database().begin(async tx=>{
  const locked=await tx`select id from businesses where id=${s.businessId!} for update`;
  if(!locked.length)throw new Error();
  const b=await getBusinessById(s.businessId!);const rows=await tx`select active from staff_users where id=${staffId} and business_id=${s.businessId!} and role='friseur' for update`;if(!rows.length)throw new Error();
  if(activate&&!rows[0].active){const counts=await tx`select count(*)::int as count from staff_users where business_id=${s.businessId!} and role='friseur' and active=true`;if(!b||!billingOperational(b)||counts[0].count>=friseurLimitFor(b.billingPlan,b.subscriptionStatus))throw new Error();}
  await tx`update staff_users set active=${activate} where id=${staffId} and business_id=${s.businessId!}`;
  if(!activate)await tx`update auth_sessions set revoked_at=now() where actor_id=${staffId} and business_id=${s.businessId!} and revoked_at is null`;
  await tx`insert into audit_logs(id,business_id,actor_type,actor_id,action,target_type,target_id) values(${id('aud')},${s.businessId!},'manager',${s.sub},${activate?'friseur.activated':'friseur.disabled'},'friseur',${staffId})`;
 });return NextResponse.redirect(new URL('/manager/friseure?teamSaved=1',req.url),303);}catch{return NextResponse.redirect(new URL('/manager/friseure?teamError=1',req.url),303);}
}
