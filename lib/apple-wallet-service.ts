import { database as db } from './db';
import { stableWalletToken } from './wallet-common';

/**
 * Prüft, ob die von Apple angefragte Pass Type ID
 * mit der in Vercel konfigurierten ID übereinstimmt.
 */
export function validApplePassType(
  passTypeIdentifier: string
) {
  return (
    Boolean(process.env.APPLE_PASS_TYPE_IDENTIFIER) &&
    passTypeIdentifier ===
      process.env.APPLE_PASS_TYPE_IDENTIFIER
  );
}

/**
 * Prüft den ApplePass Authorization Header.
 */
export function validAppleAuthorization(
  authorization: string | null,
  businessId: string,
  customerId: string
) {
  if (!authorization?.startsWith('ApplePass ')) {
    return false;
  }

  const suppliedToken = authorization
    .slice('ApplePass '.length)
    .trim();

  const expectedToken = stableWalletToken(
    'apple',
    businessId,
    customerId
  );

  return suppliedToken === expectedToken;
}

/**
 * Holt Kunde + Business für einen Apple Wallet Pass.
 *
 * serialNumber entspricht bei Rezix der customer.id.
 */
export async function getApplePassCustomer(
  serialNumber: string
) {
  const rows = await db()`
    select
      c.id,
      c.business_id,
      c.code,
      c.name,
      c.stamps,
      c.rewards_redeemed,
      c.active,
      c.updated_at,

      b.name as business_name,
      b.reward_target,
      b.reward_text,
      b.primary_color,
      b.logo_url,
      b.stamp_url,
      b.card_title,
      b.card_subtitle,
      b.customer_design,
      b.wallet_updated_at

    from customers c

    join businesses b
      on b.id = c.business_id

    where c.id = ${serialNumber}
      and c.active = true
      and b.active = true
      and b.archived_at is null

    limit 1
  `;

  return rows[0] || null;
}

/**
 * Registriert ein Apple-Gerät für Pass-Updates.
 *
 * Existiert die Registrierung bereits,
 * wird der Push Token aktualisiert.
 *
 * Rückgabe:
 *
 * true  = neue Registrierung
 * false = bestehende Registrierung aktualisiert
 */
export async function registerAppleDevice(input: {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
  pushToken: string;
  customerId: string;
  businessId: string;
}) {
  const existing = await db()`
    select 1
    from apple_wallet_registrations

    where device_library_identifier =
      ${input.deviceLibraryIdentifier}

      and pass_type_identifier =
        ${input.passTypeIdentifier}

      and serial_number =
        ${input.serialNumber}

    limit 1
  `;

  await db()`
    insert into apple_wallet_registrations (
      device_library_identifier,
      pass_type_identifier,
      serial_number,
      push_token,
      customer_id,
      business_id,
      updated_at
    )
    values (
      ${input.deviceLibraryIdentifier},
      ${input.passTypeIdentifier},
      ${input.serialNumber},
      ${input.pushToken},
      ${input.customerId},
      ${input.businessId},
      now()
    )

    on conflict (
      device_library_identifier,
      pass_type_identifier,
      serial_number
    )

    do update set
      push_token = excluded.push_token,
      customer_id = excluded.customer_id,
      business_id = excluded.business_id,
      updated_at = now()
  `;

  return existing.length === 0;
}

/**
 * Entfernt eine Apple Wallet Registrierung.
 */
export async function unregisterAppleDevice(input: {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
}) {
  await db()`
    delete from apple_wallet_registrations

    where device_library_identifier =
      ${input.deviceLibraryIdentifier}

      and pass_type_identifier =
        ${input.passTypeIdentifier}

      and serial_number =
        ${input.serialNumber}
  `;
}

/**
 * Liefert Apple alle registrierten Pässe
 * eines Geräts, die seit dem letzten
 * bekannten Stand geändert wurden.
 *
 * Ein Pass gilt als aktualisiert wenn:
 *
 * 1. customers.updated_at geändert wurde
 *    -> z.B. neuer Stempel
 *
 * ODER
 *
 * 2. businesses.wallet_updated_at geändert wurde
 *    -> z.B. Farbe, Logo, Hintergrund, Kartendesign
 */
export async function getAppleUpdatedSerialNumbers(input: {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  passesUpdatedSince?: string | null;
}) {
  const since = input.passesUpdatedSince
    ? new Date(input.passesUpdatedSince)
    : null;

  if (
    since &&
    Number.isNaN(since.getTime())
  ) {
    return null;
  }

  const rows = since
    ? await db()`
        select
          r.serial_number,
          greatest(c.updated_at, coalesce(b.wallet_updated_at, c.updated_at)) as pass_updated_at

        from apple_wallet_registrations r

        join customers c
          on c.id = r.customer_id

        join businesses b
          on b.id = c.business_id

        where
          r.device_library_identifier =
            ${input.deviceLibraryIdentifier}

          and r.pass_type_identifier =
            ${input.passTypeIdentifier}

          and c.active = true
          and b.active = true
          and b.archived_at is null

          and greatest(c.updated_at, coalesce(b.wallet_updated_at, c.updated_at)) >
            ${since.toISOString()}

        order by pass_updated_at asc
      `
    : await db()`
        select
          r.serial_number,
          greatest(c.updated_at, coalesce(b.wallet_updated_at, c.updated_at)) as pass_updated_at

        from apple_wallet_registrations r

        join customers c
          on c.id = r.customer_id

        join businesses b
          on b.id = c.business_id

        where
          r.device_library_identifier =
            ${input.deviceLibraryIdentifier}

          and r.pass_type_identifier =
            ${input.passTypeIdentifier}

          and c.active = true
          and b.active = true
          and b.archived_at is null

        order by pass_updated_at asc
      `;

  if (!rows.length) {
    return {
      serialNumbers: [] as string[],
      lastUpdated: null as string | null,
    };
  }

  const last =
    rows[rows.length - 1];

  return {
    serialNumbers: rows.map(
      (row: any) =>
        String(row.serial_number)
    ),

    lastUpdated: new Date(
      last.pass_updated_at
    ).toISOString(),
  };
}