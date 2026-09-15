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

export async function createApplePass(
  customer: WalletCustomer,
  business: WalletBusiness
) {
  if (!appleWalletConfigured()) {
    throw new Error('Apple Wallet not configured');
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
          pemFromEnv('APPLE_PASS_PRIVATE_KEY')!
        ),

        signerKeyPassphrase:
          process.env.APPLE_PASS_PRIVATE_KEY_PASSPHRASE ||
          undefined,
      },
    },
    {
      passTypeIdentifier,
      teamIdentifier,

      serialNumber: customer.id,

      organizationName: business.name,

      description:
        `${business.name} Treuekarte`,

      logoText: business.name,

      backgroundColor: hexToRgbString(
        business.primary_color
      ),

      foregroundColor: 'rgb(255,255,255)',

      labelColor: 'rgb(255,255,255)',

      // Apple Wallet ruft später diesen Rezix-Endpunkt
      // für Registrierungen und Pass-Updates auf.
      webServiceURL:
        'https://loyality.rezix.at/api/wallet/apple',

      authenticationToken: stableWalletToken(
        'apple',
        business.id,
        customer.id
      ),
    }
  );

  pass.type = 'storeCard';

  pass.primaryFields.push({
    key: 'stamps',
    label: 'STEMPEL',
    value:
      `${customer.stamps} / ${business.reward_target}`,
  });

  pass.secondaryFields.push({
    key: 'reward',
    label: 'BELOHNUNG',
    value: business.reward_text,
  });

  pass.auxiliaryFields.push({
    key: 'member',
    label: 'MITGLIED',
    value: customer.name,
  });

  pass.backFields.push({
    key: 'code',
    label: 'Kundencode',
    value: customer.code,
  });

  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: customer.code,
    messageEncoding: 'iso-8859-1',
    altText: customer.code,
  });

  return pass.getAsBuffer();
}