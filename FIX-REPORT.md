# Rezix v0.7.1 – Fehleranalyse & Redesign

## Gefundene Ursache
- Das Repository ist korrekt mit `origin/main` verbunden und der Commit `Rezix v0.7 Stripe Billing` ist bereits auf `origin/main`.
- Im Projekt lagen jedoch weiterhin Legacy-Routen aus älteren Versionen: `/owner`, `/staff` und `/setup` sowie alte API-Routen.
- Insbesondere `/setup` leitete Admins nach `/owner` weiter. Dadurch konnte ein Admin trotz neuer Rollenstruktur im alten Owner-Bereich landen.
- Die v0.7-Änderungen waren überwiegend Backend/Billing; optisch blieb die App nahezu identisch, wodurch ein erfolgreiches Deployment wie "keine Änderung" wirken konnte.
- Zusätzlich lagen versehentlich leere Root-Dateien wie `cookieStore.set(name`, `request.cookies.set(name`, `(` und `{` im Repository.

## Behoben
- `/owner` ist jetzt nur noch ein Legacy-Redirect auf die korrekte Rolle.
- `/staff` und `/staff/login` leiten auf `/friseur` bzw. `/friseur/login` weiter.
- `/setup` ist deaktiviert und führt Admins direkt nach `/admin`.
- Alte Staff-API-Endpunkte führen nicht mehr die alte Auth-Logik aus.
- Versehentliche Root-Dateien wurden entfernt.
- TypeScript-Fehler in `lib/billing.ts` und `lib/security.ts` wurden korrigiert.
- `npx tsc --noEmit` läuft fehlerfrei.

## Neues Design
- Helles, weißes SaaS-Design statt Schwarz/Gold.
- Primärfarbe: Rezix Blue `#2563EB`.
- Neue helle Logo- und Icon-Varianten.
- Modernisierte Cards, Formulare, Login, Tabellen, Status-Badges und Mobile Layouts.

## Deployment
Nach dem Kopieren in das bestehende Git-Repository:

```bash
git status
git add .
git commit -m "Rezix v0.7.1 white redesign and routing fix"
git push origin main
```

Danach in Vercel prüfen, ob der neue Commit als Production Deployment verwendet wird.

## 2026-09-13 – Salon creation on custom Vercel domain

### Symptom
Submitting the Admin salon form on `https://loyalty.rezix.at` returned:

```json
{"error":"Invalid origin"}
```

### Root cause
`sameOrigin()` compared the browser `Origin` header directly with `req.url`. Behind Vercel's reverse proxy, `req.url` can use a deployment/internal host while the public browser origin is the custom domain. This produced a false CSRF rejection.

### Fix
`sameOrigin()` now accepts the public origin resolved from `x-forwarded-host` / `x-forwarded-proto`, the canonical `NEXT_PUBLIC_APP_URL`, and Vercel's production hostname while keeping the same-origin protection enabled.

Production must set:

```env
NEXT_PUBLIC_APP_URL=https://loyalty.rezix.at
```
