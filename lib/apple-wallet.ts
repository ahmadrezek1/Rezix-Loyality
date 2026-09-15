import path from 'node:path';
import { PKPass } from 'passkit-generator';

import {
  hexToRgbString,
  pemFromEnv,
  stableWalletToken,
} from './wallet-common';

type WalletCustomer = {
  id: string;
  code: string;
  name: string;
  stamps: number;
};

type WalletBusiness = {
  id: string;
  name: string;

  reward_target: number;
  reward_text: string;

  primary_color?: string | null;

  logo_url?: string | null;
  stamp_url?: string | null;

  card_title?: string | null;
  card_subtitle?: string | null;
};

export function appleWalletConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_IDENTIFIER &&
    process.env.APPLE_TEAM_IDENTIFIER &&
    pemFromEnv('APPLE_WWDR_CERT') &&
    pemFromEnv('APPLE_PASS_CERT') &&
    pemFromEnv('APPLE_PASS_PRIVATE_KEY')
  );
}

async function downloadImage(
  url: string | null | undefined
): Promise<Buffer | null> {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get('content-type') || '';

    if (!contentType.startsWith('image/')) {
      return null;
    }

    const data = await response.arrayBuffer();

    /*
     * Schutz vor versehentlich riesigen Bildern.
     */
    if (data.byteLength > 5 * 1024 * 1024) {
      return null;
    }

    return Buffer.from(data);
  } catch (error) {
    console.error(
      'Apple Wallet image download failed.',
      error
    );

    return null;
  }
}

export async function createApplePass(
  customer: WalletCustomer,
  business: WalletBusiness
) {
  if (!appleWalletConfigured()) {
    throw new Error(
      'Apple Wallet not configured'
    );
  }

  const passTypeIdentifier =
    process.env.APPLE_PASS_TYPE_IDENTIFIER!;

  const teamIdentifier =
    process.env.APPLE_TEAM_IDENTIFIER!;

  const pass = await PKPass.from(
    {
      model: path.join(
        process.cwd(),
        'wallet/apple-model.pass'
      ),

      certificates: {
        wwdr: Buffer.from(
          pemFromEnv('APPLE_WWDR_CERT')!
        ),

        signerCert: Buffer.from(
          pemFromEnv('APPLE_PASS_CERT')!
        ),

        signerKey: Buffer.from(
          pemFromEnv(
            'APPLE_PASS_PRIVATE_KEY'
          )!
        ),

        signerKeyPassphrase:
          process.env
            .APPLE_PASS_PRIVATE_KEY_PASSPHRASE ||
          undefined,
      },
    },

    {
      passTypeIdentifier,
      teamIdentifier,

      serialNumber: customer.id,

      organizationName: business.name,

      description:
        business.card_subtitle ||
        `${business.name} Treuekarte`,

      logoText:
        business.card_title ||
        business.name,

      backgroundColor:
        hexToRgbString(
          business.primary_color
        ),

      foregroundColor:
        'rgb(255,255,255)',

      labelColor:
        'rgb(255,255,255)',

      authenticationToken:
        stableWalletToken(
          'apple',
          business.id,
          customer.id
        ),

      /*
       * Dadurch registriert sich Wallet bei unserem
       * bereits gebauten Rezix Web Service.
       */
      webServiceURL:
        `${
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://loyality.rezix.at'
        }/api/wallet/apple/v1`,
    }
  );

  pass.type = 'storeCard';

  /*
   * Unternehmer-Logo laden.
   *
   * Falls kein eigenes Logo vorhanden ist,
   * bleiben die Bilder aus apple-model.pass aktiv.
   */
  const logo = await downloadImage(
    business.logo_url
  );

  if (logo) {
    try {
      pass.addBuffer(
        'logo.png',
        logo
      );

      pass.addBuffer(
        'logo@2x.png',
        logo
      );
    } catch (error) {
      console.error(
        'Apple Wallet custom logo failed.',
        error
      );
    }
  }

  /*
   * Hauptanzeige: Stempelstand
   */
  pass.primaryFields.push({
    key: 'stamps',
    label: 'STEMPEL',
    value:
      `${customer.stamps} / ${business.reward_target}`,
  });

  /*
   * Belohnung
   */
  pass.secondaryFields.push({
    key: 'reward',
    label: 'BELOHNUNG',
    value: business.reward_text,
  });

  /*
   * Mitglied
   */
  pass.auxiliaryFields.push({
    key: 'member',
    label: 'MITGLIED',
    value: customer.name,
  });

  /*
   * Rückseite
   */
  if (business.card_subtitle) {
    pass.backFields.push({
      key: 'subtitle',
      label: 'TREUEPROGRAMM',
      value: business.card_subtitle,
    });
  }

  pass.backFields.push({
    key: 'rewardDetails',
    label: 'BELOHNUNG',
    value: business.reward_text,
  });

  pass.backFields.push({
    key: 'progress',
    label: 'FORTSCHRITT',
    value:
      `${customer.stamps} von ${business.reward_target} Stempeln`,
  });

  pass.backFields.push({
    key: 'code',
    label: 'KUNDENCODE',
    value: customer.code,
  });

  /*
   * QR-Code
   */
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: customer.code,
    messageEncoding: 'iso-8859-1',
    altText: customer.code,
  });

  return pass.getAsBuffer();
}