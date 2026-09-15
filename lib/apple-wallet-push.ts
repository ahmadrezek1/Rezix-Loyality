import http2 from 'node:http2';

import { pemFromEnv } from './wallet-common';
import { database as db } from './db';

/*
 * Prüft, ob Apple Wallet Push
 * vollständig konfiguriert ist.
 */
function applePushConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_IDENTIFIER &&
    pemFromEnv('APPLE_PASS_CERT') &&
    pemFromEnv('APPLE_PASS_PRIVATE_KEY')
  );
}

/*
 * Push Tokens für einen einzelnen
 * Kunden laden.
 *
 * Wird für Stempel / Redeem verwendet.
 */
async function getPushTokens(
  customerId: string
): Promise<string[]> {
  const rows = await db()`
    select distinct
      push_token
    from apple_wallet_registrations
    where customer_id = ${customerId}
      and pass_type_identifier =
        ${process.env.APPLE_PASS_TYPE_IDENTIFIER || ''}
  `;

  return Array.from(rows)
    .map((row: any) =>
      String(
        row.push_token || ''
      ).trim()
    )
    .filter(Boolean);
}

/*
 * Sendet einen Apple Wallet Update Push
 * an genau ein Gerät.
 *
 * Der Push selbst enthält keine neuen
 * Pass-Daten.
 *
 * Apple Wallet bekommt dadurch nur die
 * Information, dass eine neue Version
 * des Passes verfügbar sein könnte.
 */
async function sendPushToken(
  pushToken: string
): Promise<void> {
  const cert =
    pemFromEnv(
      'APPLE_PASS_CERT'
    );

  const key =
    pemFromEnv(
      'APPLE_PASS_PRIVATE_KEY'
    );

  if (!cert || !key) {
    throw new Error(
      'Apple Wallet push certificate is not configured'
    );
  }

  console.log(
    'APPLE DEBUG connecting to APNs:',
    pushToken.slice(0, 12)
  );

  const client =
    http2.connect(
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
       * Fehler beim Aufbau der
       * HTTP/2 Verbindung.
       */
      client.once(
        'error',
        (error) => {
          console.error(
            'APPLE DEBUG HTTP2 connection error:',
            error
          );

          finish(error);
        }
      );

      /*
       * APNs Request.
       */
      const request =
        client.request({
          ':method': 'POST',

          ':path':
            `/3/device/${encodeURIComponent(
              pushToken
            )}`,

          /*
           * Für Wallet Pass Updates ist
           * das Pass Type Identifier
           * gleichzeitig das APNs Topic.
           */
          'apns-topic':
            process.env
              .APPLE_PASS_TYPE_IDENTIFIER!,

          'apns-priority':
            '10',
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

          console.log(
            'APPLE DEBUG APNs HTTP status:',
            status,
            pushToken.slice(
              0,
              12
            )
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
           * Apple hat den Push akzeptiert.
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
           * APNs hat den Push abgelehnt.
           */
          console.error(
            'APPLE DEBUG APNs rejected:',
            status,
            responseBody
          );

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
          console.error(
            'APPLE DEBUG APNs request error:',
            error
          );

          finish(error);
        }
      );

      /*
       * Für Apple Wallet Pass Updates
       * wird ein leerer JSON Body gesendet.
       */
      request.end('{}');
    }
  );
}

/*
 * ==========================================
 * UPDATE FÜR EINEN EINZELNEN KUNDEN
 * ==========================================
 *
 * Wird verwendet wenn:
 *
 * - Stempel hinzugefügt wird
 * - Belohnung eingelöst wird
 */
export async function pushAppleWalletUpdate(
  customerId: string
) {
  console.log(
    'APPLE DEBUG customer update START:',
    customerId
  );

  const configured =
    applePushConfigured();

  console.log(
    'APPLE DEBUG customer configured:',
    configured
  );

  if (!configured) {
    console.error(
      'APPLE DEBUG customer push skipped: configuration missing'
    );

    return;
  }

  const tokens =
    await getPushTokens(
      customerId
    );

  console.log(
    'APPLE DEBUG customer valid tokens:',
    tokens.length
  );

  if (!tokens.length) {
    console.log(
      'APPLE DEBUG customer push: no devices found.',
      customerId
    );

    return;
  }

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
        'APPLE DEBUG customer APNs FAILED:',
        result.reason
      );
    } else {
      console.log(
        'APPLE DEBUG customer APNs SUCCESS'
      );
    }
  }

  console.log(
    'APPLE DEBUG customer update END:',
    customerId
  );
}

/*
 * ==========================================
 * UPDATE FÜR ALLE KARTEN EINES UNTERNEHMERS
 * ==========================================
 *
 * Wird nach Änderungen am Kartendesign
 * verwendet.
 *
 * Zum Beispiel:
 *
 * - Hintergrund
 * - Logo
 * - Farbe
 * - Titel
 * - Untertitel
 * - Belohnung
 */
export async function pushAppleWalletBusinessUpdate(
  businessId: string
) {
  /*
   * Damit sehen wir sicher, dass die
   * Funktion überhaupt aufgerufen wird.
   */
  console.log(
    'APPLE DEBUG business update START:',
    businessId
  );

  /*
   * Konfiguration prüfen.
   */
  const configured =
    applePushConfigured();

  console.log(
    'APPLE DEBUG configured:',
    configured,

    'passType:',
    process.env
      .APPLE_PASS_TYPE_IDENTIFIER ||
      'MISSING',

    'cert:',
    Boolean(
      pemFromEnv(
        'APPLE_PASS_CERT'
      )
    ),

    'key:',
    Boolean(
      pemFromEnv(
        'APPLE_PASS_PRIVATE_KEY'
      )
    )
  );

  if (!configured) {
    console.error(
      'APPLE DEBUG push configuration missing'
    );

    return;
  }

  /*
   * Alle Apple Wallet Registrierungen
   * dieses Unternehmens laden.
   */
  const rows = await db()`
    select distinct
      awr.push_token

    from apple_wallet_registrations awr

    join customers c
      on c.id = awr.customer_id

    where
      c.business_id = ${businessId}

      and c.active = true

      and awr.pass_type_identifier =
        ${process.env.APPLE_PASS_TYPE_IDENTIFIER || ''}
  `;

  console.log(
    'APPLE DEBUG registration rows:',
    rows.length
  );

  /*
   * Push Tokens bereinigen.
   */
  const tokens =
    Array.from(rows)
      .map((row: any) =>
        String(
          row.push_token ||
            ''
        ).trim()
      )
      .filter(Boolean);

  console.log(
    'APPLE DEBUG valid tokens:',
    tokens.length
  );

  /*
   * Keine registrierten Geräte.
   */
  if (!tokens.length) {
    console.error(
      'APPLE DEBUG no push tokens found for business:',
      businessId
    );

    return;
  }

  /*
   * Push an jedes registrierte Gerät.
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
   * Ergebnisse einzeln ausgeben.
   */
  for (
    const result of results
  ) {
    if (
      result.status ===
      'rejected'
    ) {
      console.error(
        'APPLE DEBUG business APNs FAILED:',
        result.reason
      );
    } else {
      console.log(
        'APPLE DEBUG business APNs SUCCESS'
      );
    }
  }

  console.log(
    'APPLE DEBUG business update END:',
    businessId
  );
}