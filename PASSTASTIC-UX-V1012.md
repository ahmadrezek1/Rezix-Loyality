# Rezix v1.0.12 — verified program UX

Implemented in source:
- Focused manager login and registration entry.
- Program-first manager navigation and wording.
- Loyalty editor split into Reward, Card details, Look & Feel.
- Live Apple/Google Wallet preview while typing.
- Front/back preview.
- Explicit active/live state and save-to-publish semantics.
- Existing Rezix business logic, multi-branch, Stripe and wallet routes retained.

Public Passtastic UX was used only as product/UX inspiration; no branding/assets/source code were copied.

Verification performed:
- Source changes verified directly in components and CSS.
- package-lock remains from the prior project and must be regenerated once with `npm install` because passkit-generator was added to package.json. Network access to npm registry was unavailable in the build environment, so a production build could not be truthfully certified here.
