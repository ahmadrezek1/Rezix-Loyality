import http2 from 'node:http2';

import { pemFromEnv } from './wallet-common';
import { database as db } from './db';

function applePushConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_IDENTIFIER &&
    pemFromEnv('APPLE_PASS_CERT') &&
    pemFromEnv('APPLE_PASS_PRIVATE_KEY')
  );
}

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

async function sendPushToken(
  pushToken: string
): Promise<void> {
  const cert = pemFromEnv('APPLE_PASS_CERT');
  const key = pemFromEnv('APPLE_PASS_PRIVATE_KEY');

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

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;

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

    client.once('error', (error) => {
      finish(error);
    });

    const request = client.request({
      ':method': 'POST',

      ':path':
        `/3/device/${encodeURIComponent(
          pushToken
        )}`,

      'apns-topic':
        process.env.APPLE_PASS_TYPE_IDENTIFIER!,

      'apns-priority': '10',
    });

    let responseBody = '';
    let status = 0;

    request.setEncoding('utf8');

    request.on('response', (headers) => {
      status = Number(
        headers[':status'] || 0
      );
    });

    request.on('data', (chunk) => {
      responseBody += chunk;
    });

    request.on('end', () => {
      if (status === 200) {
        finish();
        return;
      }

      finish(
        new Error(
          `Apple APNs failed: ${status} ${responseBody.slice(
            0,
            300
          )}`
        )
      );
    });

    request.on('error', (error) => {
      finish(error);
    });

    request.end('{}');
  });
}

export async function pushAppleWalletUpdate(
  customerId: string
) {
  if (!applePushConfigured()) {
    return;
  }

  const tokens =
    await getPushTokens(customerId);

  if (!tokens.length) {
    return;
  }

  const results = await Promise.allSettled(
    tokens.map((token) =>
      sendPushToken(token)
    )
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(
        'Apple Wallet APNs push failed.',
        result.reason
      );
    }
  }
}