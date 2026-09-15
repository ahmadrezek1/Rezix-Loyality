import { NextResponse } from 'next/server';

import { getBusinessBySlug } from '@/lib/store';
import { customerSession } from '@/lib/customer-session';
import {
  createApplePass,
  appleWalletConfigured,
} from '@/lib/apple-wallet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';

  const business = await getBusinessBySlug(slug);

  const customer = business
    ? await customerSession(business.id)
    : null;

  if (!business || !customer) {
    return NextResponse.json(
      {
        error:
          'Bitte melde dich erneut bei deiner Kundenkarte an.',
      },
      {
        status: 401,
        headers,
      }
    );
  }

  if (!appleWalletConfigured()) {
    return NextResponse.json(
      {
        error: 'Apple Wallet ist noch nicht verfügbar.',
      },
      {
        status: 503,
        headers,
      }
    );
  }

  try {
    const pass = await createApplePass(
      {
        id: customer.id,
        name: customer.name,
        code: customer.code,
        stamps: customer.stamps ?? 0,
      },
      {
        id: business.id,
        name: business.name,
        reward_target: business.rewardTarget,
        reward_text: business.rewardText,
        primary_color: business.primaryColor,
      }
    );

    return new Response(new Uint8Array(pass), {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition':
          'attachment; filename="rezix-kundenkarte.pkpass"',
      },
    });
  } catch (error) {
    console.error(
      'Apple Wallet: pass generation failed.',
      error
    );

    return NextResponse.json(
      {
        error:
          'Die Wallet-Karte konnte nicht erstellt werden. Bitte versuche es später erneut.',
      },
      {
        status: 503,
        headers,
      }
    );
  }
}