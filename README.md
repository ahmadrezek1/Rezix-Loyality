# Rezix Loyalty v0.7 — Multi-Salon + Secure Authentication

Rezix Loyalty ist eine mandantenfähige Loyalty-Plattform für Friseursalons. Ein globaler Rezix-Admin registriert Salons, jeder Salon erhält einen Manager, Friseure und eigene Kundenkarten/Branding-Daten.

## Rollen und URLs

- `/admin/login` — globaler Rezix Admin
- `/admin` — Salonverwaltung
- `/manager/login` — Manager Login
- `/manager` — Salon Dashboard
- `/friseur/login` — Friseur Login
- `/friseur` — Kunden erfassen / Stempel vergeben
- `/s/<slug>` — öffentliche Loyalty-Seite eines Salons

Die Kundenseite enthält keine Links zu Admin-, Manager- oder Friseur-Bereichen.

## v0.7 Authentication

- Admin + Manager: verpflichtende TOTP-2FA (Authenticator App)
- Manager + Friseur: E-Mail-Verifizierung
- Manager + Friseur: Passwort-Reset per Einmal-Link
- Kunde: SMS-OTP zur Bestätigung der Telefonnummer
- Sessions serverseitig registriert und widerrufbar
- Passwort-Reset beendet bestehende Sessions
- neue Mitarbeiter-Passwörter mit `scrypt`; alte PBKDF2-Hashes bleiben kompatibel
- Audit Log für Auth-Ereignisse

Details: `V0.6-AUTH.md` und `TESTING-V0.6.md`.

## Environment Variables

Kopiere `.env.example` nach `.env.local`.

### Core
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REZIX_ADMIN_EMAIL`
- `REZIX_ADMIN_PASSWORD_SALT`
- `REZIX_ADMIN_PASSWORD_HASH`
- `REZIX_SESSION_SECRET`
- `REZIX_DATA_ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL=https://loyalty.rezix.at`

### E-Mail
- `RESEND_API_KEY`
- `REZIX_EMAIL_FROM=Rezix <noreply@rezix.at>`

### SMS OTP
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

### Legal / GDPR
Siehe `.env.example` für `REZIX_LEGAL_*` und `REZIX_PRIVACY_EMAIL`.

## Upgrade einer bestehenden Installation

Vorher Supabase Backup erstellen. Dann:

```bash
npm install
npm run db:migrate
npm run build
npm run dev
```

`db:migrate` führt alle Migrationen bis einschließlich v0.7 aus.

Bei einer komplett frischen Datenbank:

```bash
npm run db:init
npm run db:migrate
```

## Erster Login nach v0.7

1. Admin meldet sich mit dem bestehenden Admin-Passwort an.
2. Rezix verlangt die Einrichtung einer Authenticator-App.
3. Recovery Codes sicher offline speichern.
4. Neue Manager müssen ihre E-Mail bestätigen und danach 2FA einrichten.
5. Neue Friseure müssen ihre E-Mail vor dem ersten Login bestätigen.
6. Kunden bestätigen ihre Telefonnummer mit SMS-OTP.

## Vercel

Alle Secrets nur unter **Project → Settings → Environment Variables** setzen. `.env.local` niemals committen.

Für PostgreSQL auf Vercel den Supabase Transaction Pooler verwenden.

## Sicherheitshinweise

- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `REZIX_SESSION_SECRET`, `REZIX_DATA_ENCRYPTION_KEY`, Twilio- und Resend-Secrets niemals in GitHub speichern.
- Recovery Codes nicht in Support-Tickets oder Logs kopieren.
- In Production gibt es keinen Console-Fallback für E-Mail/SMS.
- Nach Änderungen an Auth-Secrets müssen aktive Sessions ggf. erneut angemeldet werden.


## v0.7 Stripe Billing

Rezix enthält Stripe Checkout, Customer Portal, Webhooks, Testphase und Tariflimits. Einrichtung: `V0.7-STRIPE.md`.
