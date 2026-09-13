# Rezix Loyalty — PostgreSQL Production Base

Rezix Loyalty ist ein digitales Treuekartensystem für Barbershops. Diese Version enthält **keine Demo-Kunden und keine Demo-Mitarbeiter**. Die Datenbank startet leer.

## Bereiche

- `/` — öffentliche Kundenkarte / Registrierung
- `/admin/login` — Administrator-Login
- `/owner` — geschütztes Owner Dashboard
- `/staff/login` — Mitarbeiter-Login
- `/staff` — geschützter Mitarbeiterbereich

Kunden erhalten aus der öffentlichen Oberfläche keinen Link zum Owner- oder Staff-Bereich. Die Admin- und Staff-Seiten sind zusätzlich serverseitig durch Sessions geschützt.

## Datenbank

Die Anwendung verwendet PostgreSQL über `DATABASE_URL` und ist für Supabase/Neon bzw. andere PostgreSQL-Anbieter geeignet. Für Vercel sollte nach Möglichkeit die gepoolte/serverless Connection-URL des Providers verwendet werden.

### 1. Umgebungsvariablen

Kopiere `.env.example` zu `.env.local` und trage die PostgreSQL-Verbindung ein:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require
```

Die Admin-E-Mail und der PBKDF2-Hash für den initialen Administrator sind bereits vorbereitet. Das Klartext-Passwort ist nicht im Quellcode gespeichert.

Setze für Production unbedingt einen eigenen langen Wert für:

```env
REZIX_SESSION_SECRET=...
```

### 2. Installation

```bash
npm install
```

### 3. Datenbanktabellen anlegen

```bash
npm run db:init
```

Der SQL-Stand befindet sich zusätzlich in `db/schema.sql` und kann direkt im Supabase SQL Editor ausgeführt werden.

### 4. Lokal starten

```bash
npm run dev
```

Öffne `http://localhost:3000/admin/login` und melde dich mit dem initialen Administrator an. Beim ersten Start wird der First Setup Flow angezeigt. Erst dort werden echte Shopdaten angelegt.

## Vercel

1. Projekt zu Vercel hochladen.
2. `DATABASE_URL`, `REZIX_ADMIN_EMAIL`, `REZIX_ADMIN_PASSWORD_SALT`, `REZIX_ADMIN_PASSWORD_HASH` und `REZIX_SESSION_SECRET` unter Environment Variables eintragen.
3. Einmal `db/schema.sql` in Supabase ausführen oder lokal `npm run db:init` gegen dieselbe Datenbank ausführen.
4. Deployment starten.

## Sicherheit

- Admin-Passwort wird nur als PBKDF2-SHA256 Hash + Salt gespeichert.
- Staff-Passwörter werden ebenfalls PBKDF2-gehasht in PostgreSQL gespeichert.
- Session-Cookie ist `HttpOnly`, `SameSite=Lax` und in Production `Secure`.
- Stempel können nur von authentifizierten Staff/Manager-Sessions vergeben werden.
- Die Stempelvergabe läuft in einer PostgreSQL-Transaktion mit Row Lock und ist damit gegen parallele Doppel-Updates geschützt.
- Es werden keine Demo-Daten automatisch erzeugt.

## Nächste Production-Schritte

Für einen öffentlichen Launch sollten als nächstes Phone-OTP/Verifizierung, Rate Limiting, Reward Redemption, Audit Log, Passwort-Reset und automatisierte Backups ergänzt werden.
