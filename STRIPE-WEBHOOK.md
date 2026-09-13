# Stripe-Webhook einrichten

Endpoint: `https://loyalty.rezix.at/api/billing/webhook` (bei anderer Hosting-Domain entsprechend anpassen).

1. In Stripe Workbench eine Ereignis-Destination für das eigene Konto mit dieser HTTPS-URL anlegen.
2. Folgende Ereignisse abonnieren:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
3. Das Signatur-Secret dieser Destination als `STRIPE_WEBHOOK_SECRET` in der Hosting-Umgebung hinterlegen. Außerdem `STRIPE_SECRET_KEY` und die `STRIPE_PRICE_*` IDs setzen (siehe `.env.example`). Test- und Live-Modus müssen übereinstimmen. Secrets niemals ins Repository schreiben.
4. Die bestehende Billing-Migration `db/migrate-billing-v07.sql` muss angewendet sein. Sie enthält `stripe_webhook_events` und `billing_history`. Diese Änderung benötigt keine zusätzliche Schema-Migration.
5. Nach dem Deployment einen Test-Checkout mit einem zugeordneten Test-Salon durchführen. Ereignisse in Stripe und Tarifstatus in Rezix prüfen. Ein echtes Ereignis erneut senden: bereits abgeschlossene Events liefern `duplicate: true`.

## Lokal testen

```sh
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Das vom CLI ausgegebene `whsec_...` lokal setzen und den Entwicklungsserver neu starten. Anschließend einen Checkout aus Rezix mit Stripe-Testschlüsseln durchführen. Generische CLI-Fixtures besitzen keine Salon-Zuordnung und sind deshalb kein vollständiger Integrationstest.

```sh
node --test tests/billing-webhook.test.cjs
```

Automatisierte Handler-Tests verwenden isolierte Stripe-/Datenbank-Mocks. Live-Zustellung, Datenbank-Sperren und Zahlungen benötigen den Integrationstest oben.

Der Handler prüft den unveränderten Request-Body per Stripe-Signatur. Bereits verarbeitete Ereignisse werden bestätigt; noch laufende Ereignisse erhalten 503 statt einer irreführenden Erfolgsmeldung. Fehlgeschlagene Verarbeitung gibt ihre Sperre für einen erneuten Versuch frei. Abonnement- und Rechnungsereignisse lesen den aktuellen Abonnementstatus bei Stripe. Unbekannte Preis-IDs führen zu einem Fehler statt zur stillen Aktivierung des Starter-Tarifs. Die Kulanzfrist wird durch wiederholte Ereignisse nicht verlängert.

Die Ereignissperre verhindert normale doppelte Verarbeitung. Historieneinträge und Statusänderungen sind nicht gemeinsam transaktional: bei einem Prozessabbruch nach einer Teiländerung kann ein erneuter Versuch einen zusätzlichen Historieneintrag erzeugen.

Referenz: https://docs.stripe.com/webhooks
