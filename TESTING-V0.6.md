# v0.6 Testplan

1. `npm run db:migrate`
2. Admin mit korrektem Passwort anmelden.
3. Beim ersten Login Authenticator QR scannen, Code bestätigen, Recovery Codes speichern.
4. Admin neu anmelden: 2FA Challenge muss erscheinen.
5. Salon anlegen: Manager erhält Verifizierungs-E-Mail.
6. Manager bestätigt E-Mail, meldet sich an und richtet 2FA ein.
7. Manager erstellt Friseur: Verifizierungs-E-Mail muss versendet werden.
8. Friseur vor Verifizierung: Login muss blockiert sein.
9. Friseur nach Verifizierung: Login muss funktionieren.
10. „Passwort vergessen“ für Manager und Friseur testen; Reset-Link einmalig und 30 Minuten gültig.
11. Nach Password Reset prüfen, dass alte Sessions nicht mehr funktionieren.
12. Kunde auf `/s/<slug>` registrieren; Telefonnummer im Format `+43...`.
13. Falschen OTP testen, danach korrekten OTP; Karte darf erst danach erstellt/geladen werden.
14. Fünf falsche OTP-Versuche: Challenge darf nicht mehr akzeptiert werden.
15. Admin/Manager: „Andere Sitzungen abmelden“ mit zweitem Browser testen.
16. Audit Log auf Login, MFA, OTP, Reset und Session-Revoke prüfen.
