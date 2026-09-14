import {NextResponse} from 'next/server';
import {currentSession} from '@/lib/auth';
import {sameOrigin,audit} from '@/lib/security';
import {updateBusinessProfile} from '@/lib/store';
import {INDUSTRIES} from '@/lib/industries';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const s=await currentSession();if(!s||s.role!=='manager'||!s.businessId)return NextResponse.redirect(new URL('/manager/login',req.url),303);
 const f=await req.formData();const name=String(f.get('name')||'').trim();const industry=String(f.get('industry')||'other');const locationName=String(f.get('locationName')||'').trim();const street=String(f.get('street')||'').trim();const postalCode=String(f.get('postalCode')||'').trim();const city=String(f.get('city')||'').trim();const country=String(f.get('country')||'AT').trim().toUpperCase();const website=String(f.get('website')||'').trim();const counterMode=String(f.get('counterMode')||'qr') as 'qr'|'pin'|'nfc';
 if(!name||name.length>120||!INDUSTRIES.some(([id])=>id===industry)||locationName.length>120||street.length>160||postalCode.length>20||city.length>100||country.length!==2||website.length>240||!['qr','pin','nfc'].includes(counterMode))return NextResponse.redirect(new URL('/manager/settings?profileError=1',req.url),303);
 if(website&&!/^https?:\/\//i.test(website))return NextResponse.redirect(new URL('/manager/settings?profileError=1',req.url),303);
 await updateBusinessProfile({businessId:s.businessId,name,industry,locationName,street,postalCode,city,country,website,counterMode,onboardingCompleted:true});
 await audit({session:s,action:'business.profile.updated',targetType:'business',targetId:s.businessId,req,metadata:{industry,counterMode}}).catch(()=>{});
 return NextResponse.redirect(new URL('/manager/settings?profileSaved=1',req.url),303);
}
