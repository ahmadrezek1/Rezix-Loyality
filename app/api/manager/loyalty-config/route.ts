import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { getBusinessById,updateBusinessCardConfig } from '@/lib/store';
import { uploadSalonAsset } from '@/lib/storage';
import { audit,sameOrigin } from '@/lib/security';
export const runtime='nodejs';

export async function POST(req:Request){
  if(!sameOrigin(req)) return NextResponse.json({error:'Invalid origin'},{status:403});
  const s=await currentSession();
  if(!s||s.role!=='manager'||!s.businessId) return NextResponse.redirect(new URL('/manager/login',req.url),303);
  const business=await getBusinessById(s.businessId); if(!business) return NextResponse.redirect(new URL('/manager?configError=1',req.url),303);
  const f=await req.formData();
  const rewardTarget=Number(f.get('rewardTarget'));
  const rewardText=String(f.get('rewardText')||'').trim().slice(0,160);
  const cardTitle=String(f.get('cardTitle')||'').trim().slice(0,80);
  const cardSubtitle=String(f.get('cardSubtitle')||'').trim().slice(0,160);
  const primaryColor=String(f.get('primaryColor')||'').trim();
  const stampShape=String(f.get('stampShape')||'circle') as 'circle'|'rounded'|'square';
  const logo=f.get('logo'); const stamp=f.get('stamp');
  if(!Number.isInteger(rewardTarget)||rewardTarget<2||rewardTarget>30||!rewardText||!cardTitle||!cardSubtitle||!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)||!['circle','rounded','square'].includes(stampShape)) return NextResponse.redirect(new URL('/manager?configError=1',req.url),303);
  let logoUrl:string|null=null,stampUrl:string|null=null;
  try{
    if(logo instanceof File && logo.size>0) logoUrl=await uploadSalonAsset(logo,`${business.slug}/logo`);
    if(stamp instanceof File && stamp.size>0) stampUrl=await uploadSalonAsset(stamp,`${business.slug}/stamp`);
  }catch(e){console.error(e);return NextResponse.redirect(new URL('/manager?configUpload=1',req.url),303)}
  await updateBusinessCardConfig({businessId:s.businessId,rewardTarget,rewardText,cardTitle,cardSubtitle,primaryColor,stampShape,logoUrl,stampUrl});
  await audit({session:s,action:'business.loyalty.updated',targetType:'business',targetId:s.businessId,req,metadata:{rewardTarget,rewardText,cardTitle,primaryColor,stampShape,logoChanged:!!logoUrl,stampChanged:!!stampUrl}}).catch(()=>{});
  return NextResponse.redirect(new URL('/manager?configSaved=1',req.url),303);
}
