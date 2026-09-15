import {
  getAppleUpdatedSerialNumbers,
  validApplePassType,
} from '@/lib/apple-wallet-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = {
  deviceId: string;
  passTypeId: string;
};

export async function GET(
  req: Request,
  context: { params: Promise<Params> }
) {
  try {
    const {
      deviceId,
      passTypeId,
    } = await context.params;

    if (!validApplePassType(passTypeId)) {
      return new Response(null, {
        status: 404,
      });
    }

    const url = new URL(req.url);

    const passesUpdatedSince =
      url.searchParams.get('passesUpdatedSince');

    const result =
      await getAppleUpdatedSerialNumbers({
        deviceLibraryIdentifier: deviceId,
        passTypeIdentifier: passTypeId,
        passesUpdatedSince,
      });

    if (!result) {
      return new Response(null, {
        status: 400,
      });
    }

    if (!result.serialNumbers.length) {
      return new Response(null, {
        status: 204,
      });
    }

    return Response.json(
      {
        serialNumbers: result.serialNumbers,
        lastUpdated: result.lastUpdated,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error(
      'Apple Wallet update list failed.',
      error
    );

    return new Response(null, {
      status: 500,
    });
  }
}