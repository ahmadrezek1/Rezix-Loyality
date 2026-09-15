import { NextResponse } from 'next/server';

import {
  getApplePassCustomer,
  registerAppleDevice,
  unregisterAppleDevice,
  validAppleAuthorization,
  validApplePassType,
} from '@/lib/apple-wallet-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = {
  deviceId: string;
  passTypeId: string;
  serialNumber: string;
};

export async function POST(
  req: Request,
  context: { params: Promise<Params> }
) {
  try {
    const {
      deviceId,
      passTypeId,
      serialNumber,
    } = await context.params;

    if (!validApplePassType(passTypeId)) {
      return new Response(null, { status: 404 });
    }

    const customer =
      await getApplePassCustomer(serialNumber);

    if (!customer) {
      return new Response(null, { status: 404 });
    }

    if (
      !validAppleAuthorization(
        req.headers.get('authorization'),
        customer.business_id,
        customer.id
      )
    ) {
      return new Response(null, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const pushToken =
      typeof body?.pushToken === 'string'
        ? body.pushToken.trim()
        : '';

    if (!pushToken) {
      return new Response(null, { status: 400 });
    }

    const created = await registerAppleDevice({
      deviceLibraryIdentifier: deviceId,
      passTypeIdentifier: passTypeId,
      serialNumber,
      pushToken,
      customerId: customer.id,
      businessId: customer.business_id,
    });

    return new Response(null, {
      status: created ? 201 : 200,
    });
  } catch (error) {
    console.error(
      'Apple Wallet registration failed.',
      error
    );

    return new Response(null, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<Params> }
) {
  try {
    const {
      deviceId,
      passTypeId,
      serialNumber,
    } = await context.params;

    if (!validApplePassType(passTypeId)) {
      return new Response(null, { status: 404 });
    }

    const customer =
      await getApplePassCustomer(serialNumber);

    if (!customer) {
      return new Response(null, { status: 404 });
    }

    if (
      !validAppleAuthorization(
        req.headers.get('authorization'),
        customer.business_id,
        customer.id
      )
    ) {
      return new Response(null, { status: 401 });
    }

    await unregisterAppleDevice({
      deviceLibraryIdentifier: deviceId,
      passTypeIdentifier: passTypeId,
      serialNumber,
    });

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(
      'Apple Wallet unregister failed.',
      error
    );

    return new Response(null, { status: 500 });
  }
}