# Rezix Loyalty v0.4 Security

## Included
- RBAC roles: admin, manager, manager, friseur
- Tenant isolation using `business_id`
- Signed server-side sessions with 8-hour expiry and random session ID
- `HttpOnly`, `Secure` (production), `SameSite=Strict` session cookie
- Login throttling: 5 failed attempts => 15 minute temporary block
- Audit log for authentication and sensitive actions
- IP addresses are HMAC-hashed before storage
- Same-origin checks on authenticated mutation routes
- Security headers: CSP, frame denial, MIME sniffing protection, referrer and permissions policies
- Minimum 12-character passwords for new manager/friseur accounts
- Atomic stamp writes scoped to the authenticated salon

## Before production
1. Run `npm run db:migrate` once against the production database.
2. Use a random `REZIX_SESSION_SECRET` of at least 32 characters.
3. Keep `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only in Vercel secrets.
4. Never commit `.env.local`.
5. Test admin, manager, manager and friseur access with separate accounts.

## Next security work (planned)
- Password reset and e-mail verification
- 2FA for admin/manager
- Server-side session revocation/device list
- Dedicated CSRF tokens for high-risk actions
- Automated dependency and SAST checks in CI
- Security alerts and monitoring
