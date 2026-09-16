import path from 'node:path';
import sharp from 'sharp';
import { PKPass } from 'passkit-generator';

import {
  hexToRgbString,
  pemFromEnv,
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

  customer_design?: {
    mode?: 'color' | 'gradient' | 'image';

    color?: string;
    gradientColor?: string;

    imageUrl?: string | null;

    overlay?: number;

    position?:
      | 'center'
      | 'top'
      | 'bottom';

    size?:
      | 'cover'
      | 'contain';
  } | null;
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

/*
 * Lädt ein Bild aus dem Storage.
 *
 * Unterstützt z.B.:
 * JPG
 * JPEG
 * PNG
 * WebP
 */
async function downloadImage(
  url: string | null | undefined
): Promise<Buffer | null> {
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'Apple Wallet image download failed:',
        response.status,
        url
      );

      return null;
    }

    const contentType =
      response.headers.get(
        'content-type'
      ) || '';

    if (
      !contentType.startsWith('image/')
    ) {
      console.error(
        'Apple Wallet asset is not an image:',
        contentType,
        url
      );

      return null;
    }

    const data =
      await response.arrayBuffer();

    /*
     * Schutz vor versehentlich sehr
     * großen Dateien.
     */
    if (
      data.byteLength >
      5 * 1024 * 1024
    ) {
      console.error(
        'Apple Wallet image too large:',
        data.byteLength,
        url
      );

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

/*
 * Wandelt das Hintergrundbild in echte
 * PNG-Dateien für Apple Wallet um.
 *
 * Dadurch können Unternehmer weiterhin
 * JPG / PNG / WebP hochladen.
 */
async function createAppleStrip(
  source: Buffer,
  design:
    | WalletBusiness['customer_design']
    | undefined
): Promise<{
  normal: Buffer;
  retina: Buffer;
}> {
  /*
   * Position aus dem Rezix Designer
   * auf Sharp übertragen.
   */
  const position =
    design?.position === 'top'
      ? 'north'
      : design?.position === 'bottom'
        ? 'south'
        : 'centre';

  /*
   * cover / contain aus dem
   * Rezix Designer übernehmen.
   */
  const fit:
    | 'cover'
    | 'contain' =
    design?.size === 'contain'
      ? 'contain'
      : 'cover';

  /*
   * Falls contain verwendet wird,
   * brauchen freie Bereiche eine Farbe.
   */
  const background =
    design?.color &&
    /^#[0-9a-f]{6}$/i.test(
      design.color
    )
      ? design.color
      : '#142040';

  /*
   * 1x
   */
  const normal =
    await sharp(source)
      .rotate()
      .resize(375, 123, {
        fit,
        position,
        background,
      })
      .png()
      .toBuffer();

  /*
   * Retina / 2x
   */
  const retina =
    await sharp(source)
      .rotate()
      .resize(750, 246, {
        fit,
        position,
        background,
      })
      .png()
      .toBuffer();

  return {
    normal,
    retina,
  };
}

/*
 * Unternehmer-Logo ebenfalls in echtes
 * PNG umwandeln.
 *
 * Dadurch funktioniert auch ein
 * hochgeladenes JPG/WebP korrekt als
 * logo.png.
 */
async function createAppleLogo(
  source: Buffer
): Promise<{
  normal: Buffer;
  retina: Buffer;
}> {
  const normal =
    await sharp(source)
      .rotate()
      .resize({
        width: 160,
        height: 50,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

  const retina =
    await sharp(source)
      .rotate()
      .resize({
        width: 320,
        height: 100,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

  return {
    normal,
    retina,
  };
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
    process.env
      .APPLE_PASS_TYPE_IDENTIFIER!;

  const teamIdentifier =
    process.env.APPLE_TEAM_IDENTIFIER!;

  /*
   * Basis-Pass aus unserem Model laden.
   */
  const pass = await PKPass.from(
    {
      model: path.join(
        process.cwd(),
        'wallet/apple-model.pass'
      ),

      certificates: {
        wwdr: Buffer.from(
          pemFromEnv(
            'APPLE_WWDR_CERT'
          )!
        ),

        signerCert: Buffer.from(
          pemFromEnv(
            'APPLE_PASS_CERT'
          )!
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

      /*
       * Ein Kunde = eine eindeutige
       * Apple Wallet Karte.
       */
      serialNumber:
        customer.id,

      organizationName:
        business.name,

      description:
        business.card_subtitle ||
        `${business.name} Treuekarte`,

      logoText:
        business.card_title ||
        business.name,

      /*
       * Grundfarbe bleibt als Fallback
       * bestehen.
       */
      backgroundColor:
        hexToRgbString(
          business.primary_color
        ),

      foregroundColor:
        'rgb(255,255,255)',

      labelColor:
        'rgb(255,255,255)',

    }
  );

  pass.type = 'storeCard';

  /*
   * =====================================
   * UNTERNEHMER LOGO
   * =====================================
   */

  const downloadedLogo =
    await downloadImage(
      business.logo_url
    );

  if (downloadedLogo) {
    try {
      const logo =
        await createAppleLogo(
          downloadedLogo
        );

      pass.addBuffer(
        'logo.png',
        logo.normal
      );

      pass.addBuffer(
        'logo@2x.png',
        logo.retina
      );
    } catch (error) {
      console.error(
        'Apple Wallet custom logo failed.',
        error
      );
    }
  }

  /*
   * =====================================
   * HINTERGRUNDBILD
   * =====================================
   *
   * Apple Wallet verwendet bei einer
   * storeCard kein CSS background-image.
   *
   * Das Bild wird deshalb als strip.png
   * in den signierten Pass eingebaut.
   */

  const backgroundImageUrl =
    business.customer_design?.mode ===
      'image'
      ? business.customer_design
          .imageUrl
      : null;

  const downloadedBackground =
    await downloadImage(
      backgroundImageUrl
    );

  if (downloadedBackground) {
    try {
      const strip =
        await createAppleStrip(
          downloadedBackground,
          business.customer_design
        );

      pass.addBuffer(
        'strip.png',
        strip.normal
      );

      pass.addBuffer(
        'strip@2x.png',
        strip.retina
      );
    } catch (error) {
      console.error(
        'Apple Wallet custom background failed.',
        error
      );
    }
  }

  /*
   * =====================================
   * STEMPELSTAND
   * =====================================
   *
   * Lassen wir vorerst als 0 / 10,
   * 1 / 10 usw.
   *
   * Das visuelle Design können wir
   * anschließend separat verbessern.
   */

  pass.primaryFields.push({
    key: 'stamps',
    label: 'STEMPEL',
    value:
      `${customer.stamps} / ${business.reward_target}`,
  });

  /*
   * =====================================
   * BELOHNUNG
   * =====================================
   */

  pass.secondaryFields.push({
    key: 'reward',
    label: 'BELOHNUNG',
    value:
      business.reward_text,
  });

  /*
   * =====================================
   * MITGLIED
   * =====================================
   */

  pass.auxiliaryFields.push({
    key: 'member',
    label: 'MITGLIED',
    value:
      customer.name,
  });

  /*
   * =====================================
   * RÜCKSEITE
   * =====================================
   */

  if (business.card_subtitle) {
    pass.backFields.push({
      key: 'subtitle',
      label: 'TREUEPROGRAMM',
      value:
        business.card_subtitle,
    });
  }

  pass.backFields.push({
    key: 'rewardDetails',
    label: 'BELOHNUNG',
    value:
      business.reward_text,
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
    value:
      customer.code,
  });

  /*
   * =====================================
   * QR CODE
   * =====================================
   */

  pass.setBarcodes({
    format:
      'PKBarcodeFormatQR',

    message:
      customer.code,

    messageEncoding:
      'iso-8859-1',

    altText:
      customer.code,
  });

  /*
   * Pass signieren und als .pkpass
   * zurückgeben.
   */
  return pass.getAsBuffer();
}