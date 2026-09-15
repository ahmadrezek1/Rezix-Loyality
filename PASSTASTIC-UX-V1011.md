# Rezix v1.0.11 — Program-first UX

Public UX research used as inspiration (not copied): Passtastic's public create-program flow, help center program tour, card editor, customer signup flow and dashboard appearance documentation.

## Implemented
- Cleaner manager login with one focused email/password card and clear signup CTA.
- Program-first dashboard wording: "Treueprogramm" replaces the more technical "Karten & Belohnungen" label.
- Business/program name is now the dashboard breadcrumb context instead of the generic "Workspace" label.
- New card editor organized into Reward, Card details, and Look & Feel sections.
- Sticky save bar with explicit publish semantics: editing is live in preview, customer-facing changes are saved deliberately.
- Live wallet preview with Apple Wallet / Google Wallet switch.
- Front / back preview switch.
- Visible LIVE state and active program status.
- Wallet-style device frame and simulated QR area for a more realistic editing experience.
- Existing Rezix colors, routes, database model, loyalty logic, multi-branch registration, Apple Wallet and Google Wallet integrations are preserved.
- Registration copy now explicitly tells new users that setup remains editable later.

## Deliberately not copied
- No Passtastic branding, assets, source code, proprietary text, or exact UI reproduction.
- No unsupported campaign/POS/automation features were added merely because they exist on Passtastic.
- No database migration was introduced for this UX release.

## Verification
The source was statically reviewed after the changes. A local Next.js production build could not be completed in the execution environment because npm dependency installation timed out and `next` was therefore unavailable. Run `npm ci && npm run build` before deployment.
