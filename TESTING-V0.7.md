# Rezix v0.7 Test Checklist

- [ ] `npm run db:migrate` erfolgreich
- [ ] `npm run build` erfolgreich
- [ ] Manager sieht `/manager/billing`
- [ ] Salon in Trial kann Friseure bis Trial-Limit anlegen
- [ ] Abgelaufener Trial kann keinen neuen Friseur anlegen
- [ ] Kunde kann bei inaktivem Salon keinen neuen OTP-Login starten
- [ ] Friseur kann bei inaktivem Salon keinen Stempel hinzufügen
- [ ] Stripe Checkout Starter monatlich erfolgreich
- [ ] Checkout Success alleine aktiviert das Abo NICHT ohne Webhook
- [ ] Webhook aktualisiert `subscription_status=active`
- [ ] Stripe Customer Portal öffnet nur für Manager des eigenen Salons
- [ ] `invoice.payment_failed` setzt `past_due` und 7 Tage Grace Period
- [ ] Wiederholter identischer Webhook erzeugt keine doppelte Verarbeitung
- [ ] `customer.subscription.deleted` setzt Status auf canceled
- [ ] Starter verhindert Friseur #4
- [ ] Professional erlaubt bis Friseur #10
- [ ] Audit Log enthält Billing-Aktionen
- [ ] Keine `sk_` oder `whsec_` Secrets im Git Repository
