import type { CustomerDesign } from '@/lib/customer-design';
import { billingOperational } from '@/lib/billing';
import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';

import {
  getBusinessById,
  updateBusinessCardConfig,
} from '@/lib/store';

import { uploadSalonAsset } from '@/lib/storage';
import { audit, sameOrigin } from '@/lib/security';

import {
  pushAppleWalletBusinessUpdate,
} from '@/lib/apple-wallet-push';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { error: 'Invalid origin' },
      { status: 403 }
    );
  }

  const s = await currentSession();

  if (
    !s ||
    s.role !== 'manager' ||
    !s.businessId
  ) {
    return NextResponse.redirect(
      new URL('/manager/login', req.url),
      303
    );
  }

  const business =
    await getBusinessById(s.businessId);

  if (!business) {
    return NextResponse.redirect(
      new URL(
        '/manager/loyalty?configError=1',
        req.url
      ),
      303
    );
  }

  if (!billingOperational(business)) {
    return NextResponse.redirect(
      new URL(
        '/manager/loyalty?billingBlocked=1',
        req.url
      ),
      303
    );
  }

  const f = await req.formData();

  const rewardTarget =
    Number(f.get('rewardTarget'));

  const rewardText =
    String(f.get('rewardText') || '')
      .trim()
      .slice(0, 160);

  const cardTitle =
    String(f.get('cardTitle') || '')
      .trim()
      .slice(0, 80);

  const cardSubtitle =
    String(f.get('cardSubtitle') || '')
      .trim()
      .slice(0, 160);

  const primaryColor =
    String(f.get('primaryColor') || '')
      .trim();

  const stampShape =
    String(
      f.get('stampShape') || 'circle'
    ) as 'circle' | 'rounded' | 'square';

  const logo = f.get('logo');
  const stamp = f.get('stamp');

  if (
    !Number.isInteger(rewardTarget) ||
    rewardTarget < 2 ||
    rewardTarget > 30 ||
    !rewardText ||
    !cardTitle ||
    !cardSubtitle ||
    !/^#[0-9A-Fa-f]{6}$/.test(
      primaryColor
    ) ||
    ![
      'circle',
      'rounded',
      'square',
    ].includes(stampShape)
  ) {
    return NextResponse.redirect(
      new URL(
        '/manager/loyalty?configError=1',
        req.url
      ),
      303
    );
  }

  let customerDesign:
    | CustomerDesign
    | undefined;

  if (f.has('backgroundMode')) {
    const mode =
      String(f.get('backgroundMode'));

    const color =
      String(f.get('backgroundColor'));

    const gradientColor =
      String(f.get('gradientColor'));

    const overlay =
      Number(f.get('backgroundOverlay'));

    const position =
      String(f.get('backgroundPosition'));

    const size =
      String(f.get('backgroundSize'));

    if (
      ![
        'color',
        'gradient',
        'image',
      ].includes(mode) ||
      !/^#[0-9a-f]{6}$/i.test(color) ||
      !/^#[0-9a-f]{6}$/i.test(
        gradientColor
      ) ||
      !Number.isFinite(overlay) ||
      overlay < 0 ||
      overlay > 1 ||
      ![
        'center',
        'top',
        'bottom',
      ].includes(position) ||
      ![
        'cover',
        'contain',
      ].includes(size)
    ) {
      return NextResponse.redirect(
        new URL(
          '/manager/loyalty?configError=1',
          req.url
        ),
        303
      );
    }

    customerDesign = {
      mode:
        mode as CustomerDesign['mode'],

      color,
      gradientColor,
      overlay,

      position:
        position as CustomerDesign['position'],

      size:
        size as CustomerDesign['size'],

      imageUrl:
        f.get('removeBackground') === 'on'
          ? null
          : business.customerDesign.imageUrl,
    };
  }

  if (customerDesign) {
    for (
      const key of [
        'textColor',
        'headingColor',
        'mutedColor',
      ] as const
    ) {
      if (f.has(key)) {
        const value =
          String(f.get(key));

        if (
          !/^#[0-9a-f]{6}$/i.test(value)
        ) {
          return NextResponse.redirect(
            new URL(
              '/manager/loyalty?configError=1',
              req.url
            ),
            303
          );
        }

        customerDesign[key] = value;
      } else if (
        business.customerDesign[key]
      ) {
        customerDesign[key] =
          business.customerDesign[key];
      }
    }

    for (
      const [key, min, max] of [
        ['panelOpacity', 0, 1],
        ['fontSize', 12, 22],
        ['headingSize', 18, 42],
      ] as const
    ) {
      if (f.has(key)) {
        const value =
          Number(f.get(key));

        if (
          !Number.isFinite(value) ||
          value < min ||
          value > max
        ) {
          return NextResponse.redirect(
            new URL(
              '/manager/loyalty?configError=1',
              req.url
            ),
            303
          );
        }

        customerDesign[key] = value;
      } else if (
        business.customerDesign[key] !==
        undefined
      ) {
        customerDesign[key] =
          business.customerDesign[key];
      }
    }

    for (
      const key of [
        'fontFamily',
        'fontStyle',
        'fontWeight',
      ] as const
    ) {
      const value = f.has(key)
        ? String(f.get(key))
        : business.customerDesign[key];

      if (value !== undefined) {
        const allowed = {
          fontFamily: [
            'sans',
            'serif',
            'rounded',
          ],
          fontStyle: [
            'normal',
            'italic',
          ],
          fontWeight: [
            '400',
            '600',
            '700',
          ],
        };

        if (
          !allowed[key].includes(value)
        ) {
          return NextResponse.redirect(
            new URL(
              '/manager/loyalty?configError=1',
              req.url
            ),
            303
          );
        }

        Object.assign(
          customerDesign,
          { [key]: value }
        );
      }
    }
  }

  let logoUrl: string | null = null;
  let stampUrl: string | null = null;

  try {
    const background =
      f.get('background');

    if (
      customerDesign &&
      f.get('removeBackground') !==
        'on' &&
      background instanceof File &&
      background.size > 0
    ) {
      customerDesign.imageUrl =
        await uploadSalonAsset(
          background,
          `${business.slug}/background`
        );
    }

    if (
      logo instanceof File &&
      logo.size > 0
    ) {
      logoUrl =
        await uploadSalonAsset(
          logo,
          `${business.slug}/logo`
        );
    }

    if (
      stamp instanceof File &&
      stamp.size > 0
    ) {
      stampUrl =
        await uploadSalonAsset(
          stamp,
          `${business.slug}/stamp`
        );
    }
  } catch (error) {
    console.error(
      'Loyalty asset upload failed.',
      error
    );

    return NextResponse.redirect(
      new URL(
        '/manager/loyalty?configUpload=1',
        req.url
      ),
      303
    );
  }

  /*
   * Zuerst Design sicher speichern.
   */
  try {
    await updateBusinessCardConfig({
      customerDesign,
      businessId: s.businessId,
      rewardTarget,
      rewardText,
      cardTitle,
      cardSubtitle,
      primaryColor,
      stampShape,
      logoUrl,
      stampUrl,
    });
  } catch (error) {
    console.error(
      'Loyalty config update failed.',
      error
    );

    return NextResponse.redirect(
      new URL(
        '/manager/loyalty?configError=1',
        req.url
      ),
      303
    );
  }

  /*
   * Danach alle registrierten Apple-Wallet-
   * Karten dieses Unternehmers informieren.
   *
   * Ein APNs-Fehler darf das bereits
   * gespeicherte Design nicht rückgängig machen.
   */
  try {
    await pushAppleWalletBusinessUpdate(
      s.businessId
    );
  } catch (error) {
    console.error(
      'Apple Wallet design update push failed.',
      error
    );
  }

  await audit({
    session: s,
    action: 'business.loyalty.updated',
    targetType: 'business',
    targetId: s.businessId,
    req,
    metadata: {
      rewardTarget,
      rewardText,
      cardTitle,
      primaryColor,
      stampShape,
      logoChanged: !!logoUrl,
      stampChanged: !!stampUrl,
    },
  }).catch(() => {});

  return NextResponse.redirect(
    new URL(
      '/manager/loyalty?configSaved=1',
      req.url
    ),
    303
  );
}