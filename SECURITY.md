# Security implementation v1.0

- Staff/admin sessions: HMAC-signed token, server-side revocation, 8-hour expiry, HttpOnly/Secure-in-production/SameSite=Strict cookie. Active staff membership is rechecked for every authenticated request.
- Customers: random 256-bit session tokens stored only in HttpOnly cookies; only SHA-256 hashes are stored in `customer_sessions`; 180-day expiry, salon binding and active-customer/salon checks. No bearer-token URL or localStorage authentication.
- OTP verification, account creation, consent recording and session creation share one transaction. OTP is single-use, 10 minutes, five attempts. Separate IP and email send quotas.
- Atomic per-salon stamp/redeem operations with idempotency and audit. Disabled memberships and expired entitlements are checked inside the transaction.
- Team activation/creation is serialized under a salon row lock to enforce plan limits.
- Mutating APIs validate Origin (or same-origin Fetch Metadata when Origin is absent). Login and reset include IP quotas; successful-account password reset requests are also limited.
- Password reset token consumption, password update and session revocation are atomic. Email content interpolating salon names is HTML-escaped.
- Image uploads: allowlisted MIME, matching PNG/JPEG/WebP signature, fixed extension, maximum 2 MiB, server-derived salon path, random asset version. Uploads use server-only storage credentials.
- Offline fallback never caches personal/API/dashboard responses. Production CSP excludes unsafe-eval.
- Existing MFA tables are retained as historical data, not used by authentication. The public customer token column is retained for schema compatibility but is not accepted for authentication.

## Validation limits

Mocks do not establish real database locking or physical-device camera compatibility. Complete the release checklist in RELEASE-V1.md. Historical image versions are retained; periodic asset/session/log retention can be designed separately with an explicit retention policy.
