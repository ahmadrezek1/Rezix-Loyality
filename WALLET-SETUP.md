# Wallet-Einrichtung

## Stand

Die Kundenkarte enthält Apple- und Google-Wallet-Schaltflächen. Die Ausgabe erfordert eine gültige Kundensitzung für genau diesen Betrieb. Jeder Betrieb gestaltet seine Karte unter **Manager → Karten & Belohnungen** selbst. Neue Wallet-Karten übernehmen den gespeicherten Firmennamen, Kartentitel, Logo und Hintergrundfarbe. Apple übernimmt Verläufe und Hintergrundbilder als Bildstreifen; Google übernimmt Hintergrundbilder als Hero-Bild. Schriftarten, Stempelraster, Transparenz und freie Weblayouts lassen sich nicht identisch in die nativen Wallet-Layouts übertragen.

Diese erste Ausbaustufe ist ein Mitgliedsausweis mit stabilem QR-Code. Der aktuelle Stempelstand und Belohnungen bleiben über den Link zur Kundenkarte verfügbar. Bereits gespeicherte Wallet-Karten werden noch nicht automatisch aktualisiert. Änderungen an Branding oder Programmstatus erfordern für bestehende Karten später einen Apple-Update-Service mit APNs sowie Google-Object-Updates. Ein alter Wallet-Code berechtigt nicht zu einer Buchung: Die vorhandenen Mitarbeiter-Endpunkte prüfen Betrieb, Kunde und Tarif weiterhin serverseitig.

## Was noch benötigt wird

### Apple

- Lokaler Dateipfad zur vorhandenen `.pfx` und deren Passwort. Das PFX muss den **privaten Schlüssel** enthalten.
- Pass Type ID (z. B. `pass.at.rezix.loyalty`) und Apple Team ID.
- Zum Pass-Zertifikat passendes Apple-WWDR-Zwischenzertifikat.
- Bestätigte öffentliche HTTPS-Domain unter `NEXT_PUBLIC_APP_URL`.

PFX und Passwort bleiben lokal bzw. in den Secrets des Hosting-Anbieters. Passwort und private Schlüssel nicht im Chat oder in Git ablegen. Das PFX wird direkt unterstützt; keine manuelle PEM-Konvertierung nötig. Die Ausgabe prüft Gültigkeitszeitraum, Pass Type ID, Team ID, passenden privaten Schlüssel und Signatur des Zwischenzertifikats.

`APPLE_WALLET_PFX_BASE64` enthält die Base64-Kodierung der PFX-Datei, `APPLE_WALLET_PFX_PASSWORD` deren Passwort. `APPLE_WALLET_WWDR_BASE64` enthält das Zwischenzertifikat. Nach Einrichtung `APPLE_WALLET_ENABLED=true` setzen und den Server neu starten. Alternativ werden weiterhin die PEM-Variablen unterstützt.

### Google

- Google Wallet Issuer ID und eingerichtetes Google-Wallet-Ausstellerkonto.
- Service-Account-E-Mail, Wallet API aktiviert und Service Account im Wallet-Konto berechtigt.
- Privater RSA-Schlüssel aus der Service-Account-JSON, serverseitig als `GOOGLE_WALLET_KEY_BASE64` abgelegt.
- Testnutzer im Testmodus; Freigabe für öffentliche Ausgabe vor dem Produktivstart.

Nach Einrichtung `GOOGLE_WALLET_ENABLED=true` setzen. Die Anwendung signiert den Speicher-Link mit RS256. Klasse und Objekt erhalten stabile, nach Betrieb getrennte IDs. Der private Schlüssel wird nicht an den Browser geschickt.

## Abnahme

1. Zwei unterschiedliche Betriebe gestalten und je einen Kunden anmelden.
2. Apple-Pass auf einem echten iPhone hinzufügen; Logo/Farbe/Bildstreifen, Kundencode und Link prüfen.
3. Google-Pass mit berechtigtem Testkonto auf Android speichern und dieselben Felder prüfen.
4. Beide Wallet-QR-Codes mit der bestehenden Mitarbeiteransicht scannen. Fremde Betriebe dürfen keine Stempel vergeben.
5. Abgelaufene Sitzungen und fehlende Wallet-Konfiguration müssen verständliche Fehler liefern.

Quellen: [Apple-Zertifikate](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates), [Google: signierte Wallet-Links](https://developers.google.com/wallet/generic/use-cases/jwt).
