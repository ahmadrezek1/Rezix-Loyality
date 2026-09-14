import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/security';
import { forgetPin,pinCookie,pinCookieOptions } from '@/lib/pin-login';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const f=await req.formData();const role=f.get('role')==='friseur'?'friseur':'manager';const token=(await cookies()).get(pinCookie(role))?.value;if(token)await forgetPin(token);const r=NextResponse.redirect(new URL('/'+role+'/login',req.url),303);r.cookies.set(pinCookie(role),'',{...pinCookieOptions,maxAge:0});return r;}
