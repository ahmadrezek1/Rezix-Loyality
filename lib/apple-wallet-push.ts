import http2 from 'node:http2';

import { pemFromEnv } from './wallet-common';
import { database as db } from './db';

/*
 * Prüft, ob Apple Wallet Push
 * grundsätzlich konfiguriert ist.
 */
function applePushConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_IDENTIFIER &&
    pemFromEnv('APPLE_PASS_CERT') &&
    pemFromEnv('APPLE_PASS_PRIVATE_KEY')
  );
}

/*
 * Holt alle Push Tokens für
 * einen bestimmten Kunden.
 */
async function getPushTokens(
  customerId: string
): Promise<string[]> {
  const rows = await db()`
    select distinct push_token
    from apple_wallet_registrations
    where customer_id = ${customerId}
      and pass_type_identifier =
        ${process.env.APPLE_PASS_TYPE_IDENTIFIER || ''}
  `;

  return Array.from(rows)
    .map((row: any) =>
      String(row.push_token || '').trim()
    )
    .filter(Boolean);
}

/*
 * Sendet einen leeren Apple Wallet Push.
 *
 * Wichtig:
 * Der Push enthält keine neuen Kartendaten.
 * Er sagt dem iPhone nur:
 *
 * "Für diesen Pass gibt es möglicherweise
 * eine neue Version."
 *
 * Danach fragt Wallet unseren Web Service ab.
 */
async function sendPushToken(
  pushToken: string
): Promise<void> {
  const cert =
    pemFromEnv('APPLE_PASS_CERT');

  const key =
    pemFromEnv(
      'APPLE_PASS_PRIVATE_KEY'
    );

  if (!cert || !key) {
    throw new Error(
      'Apple Wallet push certificate is not configured'
    );
  }

  const client = http2.connect(
    'https://api.push.apple.com',
    {
      cert,
      key,

      passphrase:
        process.env
          .APPLE_PASS_PRIVATE_KEY_PASSPHRASE ||
        undefined,
    }
  );

  await new Promise<void>(
    (resolve, reject) => {
      let settled = false;

      const finish = (
        error?: Error
      ) => {
        if (settled) {
          return;
        }

        settled = true;

        try {
          client.close();
        } catch {}

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      /*
       * HTTP/2 Connection Error
       */
      client.once(
        'error',
        (error) => {
          finish(error);
        }
      );

      /*
       * Apple Wallet Push Request
       */
      const request =
        client.request({
          ':method': 'POST',

          ':path':
            `/3/device/${encodeURIComponent(
              pushToken
            )}`,

          /*
           * Für Wallet Pass Updates
           * ist das Pass Type Identifier
           * unser APNs Topic.
           */
          'apns-topic':
            process.env
              .APPLE_PASS_TYPE_IDENTIFIER!,

          'apns-priority': '10',
        });

      let responseBody = '';
      let status = 0;

      request.setEncoding(
        'utf8'
      );

      request.on(
        'response',
        (headers) => {
          status = Number(
            headers[
              ':status'
            ] || 0
          );
        }
      );

      request.on(
        'data',
        (chunk) => {
          responseBody +=
            chunk;
        }
      );

      request.on(
        'end',
        () => {
          /*
           * APNs hat den Push akzeptiert.
           */
          if (status === 200) {
            console.log(
              'Apple Wallet APNs push accepted.',
              pushToken.slice(
                0,
                12
              )
            );

            finish();

            return;
          }

          /*
           * APNs Fehler
           */
          finish(
            new Error(
              `Apple APNs failed: ${status} ${responseBody.slice(
                0,
                300
              )}`
            )
          );
        }
      );

      request.on(
        'error',
        (error) => {
          finish(error);
        }
      );

      /*
       * Wallet Push Payload.
       *
       * Bei Pass Updates ist ein
       * leerer JSON Body ausreichend.
       */
      request.end('{}');
    }
  );
}

/*
 * =====================================
 * EINEN KUNDEN AKTUALISIEREN
 * =====================================
 *
 * Wird verwendet nach:
 *
 * - Stempel hinzufügen
 * - Belohnung einlösen
 */
export async function pushAppleWalletUpdate(
  customerId: string
) {
  if (!applePushConfigured()) {
    console.log(
      'Apple Wallet push skipped: not configured.'
    );

    return;
  }

  const tokens =
    await getPushTokens(
      customerId
    );

  if (!tokens.length) {
    console.log(
      'Apple Wallet customer push: no devices found.',
      customerId
    );

    return;
  }

  console.log(
    'Apple Wallet customer push:',
    customerId,
    'devices:',
    tokens.length
  );

  const results =
    await Promise.allSettled(
      tokens.map(
        (token) =>
          sendPushToken(
            token
          )
      )
    );

  for (
    const result of results
  ) {
    if (
      result.status ===
      'rejected'
    ) {
      console.error(
        'Apple Wallet APNs push failed.',
        result.reason
      );
    }
  }
}

/*
 * =====================================
 * ALLE KARTEN EINES UNTERNEHMERS
 * AKTUALISIEREN
 * =====================================
 *
 * Wird verwendet wenn der Unternehmer
 * z.B. folgendes ändert:
 *
 * - Hintergrund
 * - Logo
 * - Farbe
 * - Kartentitel
 * - Untertitel
 * - Belohnung
 * - Design
 */
export async function pushAppleWalletBusinessUpdate(
  businessId: string
) {
  if (!applePushConfigured()) {
    console.log(
      'Apple Wallet business push skipped: not configured.',
      businessId
    );

    return;
  }

  /*
   * Alle registrierten Apple Wallet
   * Geräte dieses Unternehmens finden.
   */
  const rows = await db()`
    select distinct
      awr.push_token

    from apple_wallet_registrations awr

    join customers c
      on c.id =
        awr.customer_id

    where
      c.business_id =
        ${businessId}

      and c.active = true

      and awr.pass_type_identifier =
        ${process.env.APPLE_PASS_TYPE_IDENTIFIER || ''}
  `;

  const tokens =
    Array.from(rows)
      .map((row: any) =>
        String(
          row.push_token ||
            ''
        ).trim()
      )
      .filter(Boolean);

  /*
   * Keine Wallet Karten registriert.
   */
  if (!tokens.length) {
    console.log(
      'Apple Wallet business push: no devices found.',
      businessId
    );

    return;
  }

  console.log(
    'Apple Wallet business push:',
    businessId,
    'devices:',
    tokens.length
  );

  /*
   * Push an alle registrierten Geräte.
   */
  const results =
    await Promise.allSettled(
      tokens.map(
        (token) =>
          sendPushToken(
            token
          )
      )
    );

  /*
   * Einzelne fehlerhafte Geräte dürfen
   * die anderen Updates nicht stoppen.
   */
  for (
    const result of results
  ) {
    if (
      result.status ===
      'rejected'
    ) {
      console.error(
        'Apple Wallet business design push failed.',
        result.reason
      );
    }
  }

  console.log(
    'Apple Wallet business push completed.',
    businessId
  );
}