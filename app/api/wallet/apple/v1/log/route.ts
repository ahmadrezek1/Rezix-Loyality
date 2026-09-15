export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const logs = Array.isArray(body?.logs)
      ? body.logs
      : [];

    for (const entry of logs.slice(0, 50)) {
      if (typeof entry === 'string') {
        console.log(
          'Apple Wallet log:',
          entry.slice(0, 2000)
        );
      }
    }

    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    console.error(
      'Apple Wallet log endpoint failed.',
      error
    );

    return new Response(null, {
      status: 500,
    });
  }
}