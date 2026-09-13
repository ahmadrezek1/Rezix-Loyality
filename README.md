# Rezix Loyalty v1.0

Existing Next.js 15 + TypeScript multi-salon application. PostgreSQL, Supabase Storage, Resend, optional online billing. No demo accounts or sample database customers are created.

## Setup

1. Configure `.env.local` locally or the equivalent environment variables on Vercel.
2. `npm install`
3. For an empty database only: `npm run db:init`.
4. `npm run db:migrate`
5. `npm test`
6. `npx tsc --noEmit`
7. `npm run build`
8. `npm run start` (or `npm run dev` for local development).

Migrations run in a transaction and are tracked in `rezix_migrations`; reruns skip applied files. No blanket email-verification update is performed. Keep a database backup before future deployments. Both old MFA data and historical billing identifiers remain in existing databases; the application no longer uses MFA.

## Roles

- Admin: `/admin/login`, `/admin/salons`, `/admin/subscriptions`, `/admin/system`. Salon list contains no salon customers. Salon detail supports rename, suspend, archive, restore, manual non-payment tariff assignment, and manager access links.
- Manager: `/manager/login`. Own salon customers (25 per page), team, card configuration, billing and internal privacy requests. Existing online subscriptions must be managed through the payment portal. Manual assignment cannot overwrite an active online subscription.
- Friseur: `/friseur/login`. QR scan or manual code; add stamps and confirm rewards. All operations are scoped to the authenticated salon.
- Customer: `/s/<slug>`. Email OTP when no valid session exists; per-salon HttpOnly, Secure-in-production cookies, 180-day server-side sessions. Old localStorage tokens are rejected; existing customers verify email once after this upgrade. Customer records and rewards are preserved.

## Plans

Monthly checkout only: Trial / Starter: 1 active Friseur, Professional: 5, Business: 100. Trial lasts 3 days. Expired subscriptions block loyalty mutations. Existing customers can view their cards while the subscription is paused; manager login/billing stay available. Suspending/archiving the salon disables the public program. Archiving never cancels a paid subscription and never deletes data.

A staff member must confirm redemption. Stamp/redeem requests require a UUID `Idempotency-Key`; retry the same key after uncertain network failures. Visit, card change, operation response and audit commit together. An operation key cannot be reused for a different customer, staff member or action.

## Environment

Required application settings:
- `DATABASE_URL` (PostgreSQL; Supabase pooler supported)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-side storage only; bucket `rezix-assets`)
- `RESEND_API_KEY`, `REZIX_EMAIL_FROM=Rezix <noreply@rezix.at>` (verified sending domain)
- `NEXT_PUBLIC_APP_URL=https://loyalty.rezix.at`
- `REZIX_SESSION_SECRET` (random, at least 32 characters)
- `REZIX_ADMIN_EMAIL`, `REZIX_ADMIN_PASSWORD_SALT`, `REZIX_ADMIN_PASSWORD_HASH` (initial admin credentials; email-confirmed admin can reset password through Resend; subsequent hash stored in DB)
- `REZIX_LEGAL_*`, `REZIX_PRIVACY_EMAIL` for company/contact information.

Online billing is deferred to the final setup stage at the user's request. When enabled: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_PROFESSIONAL_MONTHLY`, `STRIPE_PRICE_BUSINESS_MONTHLY`, optionally `STRIPE_AUTOMATIC_TAX`. See `STRIPE-WEBHOOK.md`. Historical yearly price environment variables may be retained to recognize existing subscriptions; no new yearly checkout is accepted.

Do not commit secrets. `.env.local` is ignored. No SMS/Twilio or Authenticator settings are needed.

## Mobile / offline

Manifest, PNG icons, Apple home-screen metadata and a small production service worker are included. Only the generic offline page and its icon are cached. API responses, authenticated pages and customer cards are never cached. Loyalty changes require an online confirmation. Camera scanning still requires HTTPS and camera permission. Validate on physical iPhone Safari and Android Chrome before public launch.

## Checks and release limitations

See `RELEASE-V1.md`. Unit tests use isolated in-memory fixtures, never production writes. Service credentials and real role sessions are needed for end-to-end email/storage/camera testing. Historic v0.x notes describe old behavior and are not current installation instructions.
