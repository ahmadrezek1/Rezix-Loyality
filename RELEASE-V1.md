# Rezix Loyalty v1.0 – Release review

## Implemented

- Existing app retained; dark-blue sidebar, white header/cards, dedicated routes and current navigation state.
- Admin salon details: rename, activate/suspend/archive/restore, metadata, manager email/access link, public card URL. Separate subscription overview. Manual plan assignment for salons without a running online subscription; this does not collect payment.
- Manager: complete paginated customer list, name edit, internal export/erasure requests, team list and access controls, current monthly/active/reward metrics, sessions and privacy processing.
- Customer cookie authentication, transactional email OTP, optional separate marketing consent; saved card remains viewable when a subscription expires. Staff confirmation remains mandatory for redemption.
- Transactional stamp/redeem idempotency; atomic team quota; CSRF and request limits; atomic password reset; validated image file signatures.
- PWA icons/manifest/Apple metadata, production offline fallback, readable not-found/error pages; current README/security documentation.

## Files changed (groups)

- Authentication: `lib/auth.ts`, `lib/auth-store.ts`, `lib/customer-session.ts`, `lib/login-flow.ts`, `lib/security.ts`, customer/auth/login API routes and customer UI.
- Data/loyalty: `lib/store.ts`, `lib/db.ts`, `lib/loyalty-handler.ts`, stamp/redeem API routes, `components/FriseurConsole.tsx`.
- Management: `lib/admin-business.ts`, admin business mutation/access APIs, admin salon detail and subscription pages, `components/SalonAdministration.tsx`, `components/ManagerPrivacy.tsx`, manager customer/team/privacy APIs, workspace components and styles.
- Deployment/PWA: `public/sw.js`, `public/offline.html`, manifest and PNG icons, `components/PwaRegistration.tsx`, app layout/error/not-found, `next.config.mjs`, dependency lockfile, `.env.example`.
- Tests: `tests/loyalty.test.cjs`, `tests/security.test.cjs`, TypeScript test loader; existing webhook tests retained.

## Database

New `db/migrate-v100.sql`: `customer_sessions`, `loyalty_operations`, `businesses.archived_at`, persisted admin password reset fields, admin support in reset tokens. Updated migration runner records applied files and wraps application in a transaction. Removed automatic email verification from the old authentication migration. Removed unused MFA table creation from fresh schema/migration source; existing historical tables/data are preserved.

Migration applied successfully to the configured database, and a second run skipped recorded migrations successfully. No test users, salons, customers, visits or rewards were inserted. No live payment or email was sent during validation.

## Removed legacy code

Owner/staff/setup pages and legacy API redirects, unused StaffConsole, SMS stub, pending MFA helpers, obsolete MFA cleanup script/note and empty accidental root files. Legacy customer bearer-token lookup helpers removed. New yearly checkout rejected; historical price recognition retained to avoid breaking existing subscriptions.

## Required configuration

See README.md and .env.example. Local inspection found Resend and Supabase Storage credentials missing, and online billing credentials missing. This does not establish whether they are configured on Vercel. Stripe Webhook activation remains deferred as requested.

## Manual acceptance checklist

- Admin email confirmation and password reset; create an actual salon, inspect its card/login links, manager email and plan.
- Manager email confirmation and login; tenant A must not read/export/edit customers or staff of tenant B.
- Team creation/reactivation at 1/5/100 plan limit; concurrent requests must not exceed the limit; deactivation revokes access.
- New customer email OTP; failed/expired/replayed OTP rejected. Returning same-device customer opens card directly; separate salons use separate cookies.
- Marketing consent is optional and independent. Privacy export is scoped to the manager's salon; confirmed erasure disables customer sessions.
- Physical iPhone Safari and Android Chrome: camera start/stop, single QR detection, manual fallback, permission denial.
- Stamp to target, replay a request key, attempt early redemption, redeem once, retry after a network failure. Confirm visit/reward/audit totals.
- Trial expiry: mutations denied, manager billing reachable, customer can still read existing card. Archive/suspend retains data; restore works.
- Upload PNG/JPEG/WebP; reject mismatched MIME/signature and files over 2 MiB.
- Install on phone; verify offline fallback without cached customer or admin data.
- Final separate stage: configure online billing and verify checkout, portal, webhook delivery, cancellation, invoice failure and grace expiry.

## Remaining release gates

- Real Resend delivery, storage upload and authenticated browser end-to-end testing need configured service credentials and real account access.
- Stripe integration is not activated or live-tested in this stage.
- Legal pages still identify themselves as drafts; actual company details and final contractual text must be supplied before commercial launch.
- Website has not been deployed by this task. Review code and deploy together with the matching schema.
- Existing localStorage customers must verify email once after upgrade. Previous stamps and rewards are retained.

## Final validation results

- Production build passed, including TypeScript validation and generation of 44 static pages.
- All 20 automated tests passed. Security, loyalty transactions and webhook handling use isolated mocks; this is not a live service or real-device end-to-end test.
- Dependency audit reported zero known vulnerabilities during this validation.
- Public home, salon registration, manager login and PWA assets returned successfully. Protected workspace routes redirected unauthenticated visitors to login; customer API returned 401 with private/no-store caching.
- Salon registration visually checked on desktop and at a 390-pixel mobile viewport. Fixed checkbox alignment and associated name/email/OTP labels with their inputs.
- Card configuration now rechecks salon entitlement under a database row lock at save time, preventing a save after suspension during an upload. Added a regression test.
- No deployment, live Stripe activation, outbound email or test customer creation was performed. The release gates above still apply.

## Marketing and customer-page design update

- Public landing removes Manager/Friseur entry links, uses the supplied rabbit only in the marketing hero, and adds lightweight CSS motion with reduced-motion support.
- Customer registration and existing salon-creation UI gain entrance/CTA/success animations; submission/authentication behavior is unchanged.
- Manager > Karten & Belohnungen contains the new Kunden-Seite Design section with a live background preview: color, gradient, image, white overlay, position and size. Existing card/reward controls remain.
- Minimal migration `db/migrate-customer-design-v101.sql` adds only `businesses.customer_design` JSONB. Applied to the configured database. Deployments must run `npm run db:migrate` before using background saving.
- Existing Storage upload validates PNG/JPEG/WebP up to 2 MiB and now accepts a salon-scoped background asset path. Actual upload remains untested locally because Storage credentials are absent.
- Explainer modal supports Escape, close button, outside click, focus return and scroll locking. Missing video shows a clean fallback. Add `public/media/rezix-explainer.mp4` or configure `NEXT_PUBLIC_REZIX_EXPLAINER_VIDEO` and rebuild. Production outline is in `public/media/README.md`; no actual video has been generated.
- Production build and all 24 automated tests passed. Browser checks covered the marketing page and video fallback/close controls on desktop and a 390px mobile viewport. Authenticated Manager UI and real uploads still require manual acceptance testing with a real account.
- No changes to authentication, QR scanning, redemption algorithms, billing, Stripe, trial limits or role rules in this update. The customer response includes only the additional public design settings.

## Public manager registration and marketing refinement

- Public header and CTAs now provide Login and Registrieren for managers. Registration creates a salon and manager through the existing transactional store function, so the salon appears in the existing Admin salon list. No customer records or elevated roles are created by this endpoint.
- New manager signup uses a six-digit email verification code instead of a link, valid for 10 minutes, with five attempts, one-time consumption, hashed codes bound to random challenge IDs, rate limits and resend. The existing manager login still requires a verified email and password; existing login/session/reward/Stripe logic is unchanged.
- Migration `migrate-manager-verification-v102.sql` adds the separate challenge table and was applied. Deployment must run migrations first. This update does not change existing salon trial end dates; new salons continue to receive exactly 3 days through the existing creation logic.
- Marketing hero uses the generated transparent head-and-paws rabbit asset over the actual HTML loyalty card. Added workflow, manager/customization descriptions and a 3-day trial CTA, with responsive styles and reduced-motion support.
- All 30 isolated automated tests passed, including registration validation, email delivery failure, code expiry, maximum attempts and replay protection. Real email delivery and an actual account registration were not exercised locally; no test salon/customer was inserted.
