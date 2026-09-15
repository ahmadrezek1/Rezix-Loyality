import {
  createApplePass,
  appleWalletConfigured,
} from '@/lib/apple-wallet';

import {
  getApplePassCustomer,
  validAppleAuthorization,
  validApplePassType,
} from '@/lib/apple-wallet-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = {
  passTypeId: string;
  serialNumber: string;
};

export async function GET(
  req: Request,
  context: { params: Promise<Params> }
) {
  try {
    const {
      passTypeId,
      serialNumber,
    } = await context.params;

    if (!validApplePassType(passTypeId)) {
      return new Response(null, {
        status: 404,
      });
    }

    if (!appleWalletConfigured()) {
      return new Response(null, {
        status: 503,
      });
    }

    const row =
      await getApplePassCustomer(serialNumber);

    if (!row) {
      return new Response(null, {
        status: 404,
      });
    }

    if (
      !validAppleAuthorization(
        req.headers.get('authorization'),
        row.business_id,
        row.id
      )
    ) {
      return new Response(null, {
        status: 401,
      });
    }

    const pass = await createApplePass(
      {
        id: row.id,
        name: row.name,
        code: row.code,
        stamps: Number(row.stamps ?? 0),
      },
      {
        id: row.business_id,
        name: row.business_name,
        reward_target: Number(
          row.reward_target
        ),
        reward_text: row.reward_text,
        primary_color:
          row.primary_color ?? null,
      }
    );

    return new Response(
      new Uint8Array(pass),
      {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.apple.pkpass',

          'Cache-Control':
            'private, no-store',

          'X-Content-Type-Options':
            'nosniff',

          'Last-Modified':
            new Date().toUTCString(),
        },
      }
    );
  } catch (error) {
    console.error(
      'Apple Wallet pass update failed.',
      error
    );

    return new Response(null, {
      status: 500,
    });
  }
}