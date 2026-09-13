import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { getCustomerExport } from '@/lib/store';
export async function GET(req:Request){const s=await currentSession();if(!s||s.role!=='manager'||!s.businessId)return NextResponse.json({error:'Unauthorized'},{status:401});const data=await getCustomerExport(new URL(req.url).searchParams.get('id')||'',s.businessId);if(!data)return NextResponse.json({error:'Nicht gefunden'},{status:404});return new NextResponse(JSON.stringify(data,null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="rezix-kundendaten.json"','Cache-Control':'no-store'}});}
