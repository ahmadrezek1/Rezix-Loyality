import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sameOrigin,consumeRateLimit,requestIp,audit } from '@/lib/security';
import { loginWithPin,pinCookie } from '@/lib/pin-login';
import { completeSession } from '@/lib/login-flow';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const f=await req.formData();const role=f.get('role');if(role!=='manager'&&role!=='friseur')return NextResponse.json({error:'Invalid role'},{status:400});try{const token=(await cookies()).get(pinCookie(role))?.value;if(token&&await consumeRateLimit('pin-login-ip',requestIp(req),20,15)){const user=await loginWithPin(token,role,String(f.get('pin')||''));if(user){await audit({actorType:role,actorId:user.sub,businessId:user.businessId,action:'auth.login.success',req,metadata:{method:'trusted-device-pin'}}).catch(()=>{});return await completeSession(req,user,'/'+role);}}}catch{}return NextResponse.redirect(new URL('/'+role+'/login?pinError=1',req.url),303);}
