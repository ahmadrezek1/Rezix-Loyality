import { NextResponse } from 'next/server';

import { getBusinessBySlug } from '@/lib/store';
import { customerSession } from '@/lib/customer-session';

import {
  appleWalletConfigured,
  createApplePass,
} from '@/lib/apple-wallet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const slug =
      new URL(req.url).searchParams.get('slug') || '';

    const b = await getBusinessBySlug(slug);

    if (!b) {
      return NextResponse.json(
        { error: 'Betrieb nicht gefunden.' },
        { status: 404 }
      );
    }

    const c = await customerSession(b.id);

    if (!c) {
      return NextResponse.json(
        { error: 'Nicht angemeldet.' },
        { status: 401 }
      );
    }

    if (!appleWalletConfigured()) {
      return NextResponse.json(
        {
          error:
            'Apple Wallet ist noch nicht konfiguriert.',
        },
        { status: 503 }
      );
    }

    const buffer = await createApplePass(
      {
        id: c.id,
        code: c.code,
        name: c.name,
        stamps: c.stamps,
      },
      {
        id: b.id,
        name: b.name,

        reward_target: b.rewardTarget,
        reward_text: b.rewardText,

        primary_color: b.primaryColor,

        // Design des Unternehmers
        logo_url: b.logoUrl,
        stamp_url: b.stampUrl,
        card_title: b.cardTitle,
        card_subtitle: b.cardSubtitle,
      }
    );

    return new NextResponse(
      new Uint8Array(buffer),
      {
        headers: {
          'content-type':
            'application/vnd.apple.pkpass',

          'content-disposition':
            'attachment; filename="rezix.pkpass"',

          'cache-control':
            'private, no-store',

          'x-content-type-options':
            'nosniff',
        },
      }
    );
  } catch (e) {
    console.error(
      'Apple Wallet pass generation failed.',
      e
    );

    return NextResponse.json(
      {
        error:
          'Apple Wallet Karte konnte nicht erstellt werden.',
      },
      { status: 500 }
    );
  }
}