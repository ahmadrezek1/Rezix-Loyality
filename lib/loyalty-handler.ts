import { NextResponse } from 'next/server';

import { currentSession } from './auth';

import {
  loyaltyOperation,
  getBusinessById,
  getCustomerByCodeForBusiness,
} from './store';

import {
  sameOrigin,
  consumeRateLimit,
} from './security';

import {
  googleWalletConfigured,
  syncGoogleWallet,
} from './google-wallet';
import { pushAppleWalletUpdate } from './apple-wallet-push';


export async function handleLoyalty(
  req: Request,
  operation: 'stamp' | 'redeem'
) {
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { error: 'Ungültige Anfrage' },
      { status: 403 }
    );
  }

  const s = await currentSession();

  if (
    !s ||
    s.role !== 'friseur' ||
    !s.businessId
  ) {
    return NextResponse.json(
      { error: 'Nicht angemeldet' },
      { status: 401 }
    );
  }

  if (
    !await consumeRateLimit(
      'loyalty',
      s.sub,
      120,
      1
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Zu viele Anfragen. Bitte kurz warten.',
      },
      { status: 429 }
    );
  }

  const body = await req
    .json()
    .catch(() => null);

  const code = String(body?.code || '')
    .trim()
    .toUpperCase();

  const requestId =
    req.headers.get('idempotency-key') || '';

  if (
    !/^RZX-[A-F0-9]{8}$/.test(code) ||
    !/^[a-f0-9-]{36}$/i.test(requestId)
  ) {
    return NextResponse.json(
      {
        error:
          'Ungültiger Kundencode oder fehlende Vorgangs-ID.',
      },
      { status: 400 }
    );
  }

  try {
    /*
     * 1. Zuerst die Loyalty-Operation vollständig
     * in PostgreSQL abschließen.
     */
    const result = await loyaltyOperation(
      code,
      s.sub,
      s.businessId,
      requestId,
      operation
    );

    if (result.kind === 'ok') {
      /*
       * 2. Aktuellen Kunden- und Business-Stand
       * NACH der DB-Transaktion laden.
       */
      try {
        const [customer, business] =
          await Promise.all([
            getCustomerByCodeForBusiness(
              code,
              s.businessId
            ),

            getBusinessById(
              s.businessId
            ),
          ]);

        if (customer && business) {
          /*
           * GOOGLE WALLET
           *
           * Fehler dürfen die erfolgreiche
           * Loyalty-Operation nicht rückgängig machen.
           */
          if (googleWalletConfigured()) {
            try {
              await syncGoogleWallet(
                {
                  id: customer.id,
                  code: customer.code,
                  name: customer.name,
                  stamps: customer.stamps,
                  rewards_redeemed:
                    customer.rewardsRedeemed,
                },
                {
                  id: business.id,
                  name: business.name,
                  reward_target:
                    business.rewardTarget,
                  reward_text:
                    business.rewardText,
                  primary_color:
                    business.primaryColor,
                  logo_url:
                    business.logoUrl,
                }
              );
            } catch (googleWalletError) {
              console.error(
                'Google Wallet sync after loyalty operation failed.',
                googleWalletError
              );
            }
          }

          /*
           * APPLE WALLET
           *
           * Apple Wallet does not poll continuously. After a stamp/redeem
           * APNs must notify every registered device so Wallet fetches the
           * freshly generated pass from the web service.
           */
          try {
            await pushAppleWalletUpdate(customer.id);
          } catch (appleWalletError) {
            console.error(
              'Apple Wallet push after loyalty operation failed.',
              appleWalletError
            );
          }

        }
      } catch (walletDataError) {
        /*
         * Auch ein Fehler beim erneuten Laden der
         * Wallet-Daten darf den Stempel nicht
         * rückgängig machen.
         */
        console.error(
          'Wallet data reload after loyalty operation failed.',
          walletDataError
        );
      }

      /*
       * Loyalty war erfolgreich.
       */
      return NextResponse.json(
        result.response
      );
    }

    const status =
      result.kind === 'blocked'
        ? 402
        : result.kind === 'not-found'
          ? 404
          : 409;

    return NextResponse.json(
      {
        error:
          result.kind === 'blocked'
            ? 'Salon-Tarif oder Zugang ist nicht aktiv.'
            : result.kind === 'not-found'
              ? 'Kunde dieses Salons nicht gefunden.'
              : 'Kartenstatus geändert. Bitte Kundenkarte erneut laden.',
      },
      { status }
    );
  } catch (error) {
    console.error(
      'Loyalty operation failed',
      error
    );

    return NextResponse.json(
      {
        error:
          'Vorgang konnte nicht bestätigt werden. Bitte mit derselben Aktion erneut versuchen.',
      },
      { status: 503 }
    );
  }
}