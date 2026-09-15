# Performance-Prüfung

## Gefundene Ursachen und Änderungen

- Alle Manager-Unterseiten luden dieselben zehn Datenbankabfragen. Jetzt lädt der Designer eine, die Teamseite zwei, die Kundenseite drei und die Übersicht sechs. Alle bisher dargestellten Daten und Aktionen bleiben erhalten.
- Die Sitzungsprüfung benötigte für Mitarbeiter drei aufeinanderfolgende Abfragen und schrieb bei jedem Aufruf `last_seen_at`. Eine gemeinsame Abfrage prüft nun Sitzung und Mitarbeiter. Die Aktivitätszeit wird höchstens alle fünf Minuten geschrieben; Widerruf und Sperrung werden weiterhin bei jedem Zugriff geprüft.
- Der Datenbankpool schloss inaktive Verbindungen nach fünf Sekunden. Jetzt bleiben sie 60 Sekunden verfügbar, bei weiterhin höchstens zwei Verbindungen je Instanz. Lokale Messung gegen die konfigurierte Datenbank: erster Aufbau 574 ms, danach 45/47 ms. Dies ist keine Messung der öffentlichen Webseite.
- Synchrone scrypt/PBKDF2-Passwort- und PIN-Berechnung blockierte den Node-Event-Loop. Diese Berechnungen verwenden nun die asynchronen Crypto-Funktionen. Bestehende Hashes bleiben gültig.
- Fokus- und Sichtbarkeitsereignisse konnten parallele Kundenkartenabfragen auslösen. Jetzt nur eine laufende Aktualisierung, kurzes Zusammenfassen gleichzeitiger Ereignisse, Abbruch beim Verlassen und 15-Sekunden-Zeitlimit.
- Das Startseitenmotiv hatte rund 1,06 MB. Next Image liefert nun passende Bildgrößen und optimierte Formate; das Originalmotiv bleibt erhalten.
- Ladezustände geben bei Dashboard-Navigation sofort Rückmeldung.

## Veröffentlichung

Die zusätzliche Migration `db/migrate-performance-v108.sql` ergänzt Indizes für Kundenpagination und Besuche. Sie ist im Migrationsskript registriert. Vor dem Deployment den üblichen gesicherten Migrationsprozess verwenden; diese Arbeit startet keinen vollständigen Migrationslauf gegen die konfigurierte Datenbank.

Produktiv mit `npm run build` und `npm start` betreiben. `next dev` kompiliert Seiten beim Aufruf und ist kein Geschwindigkeitsmaßstab. Änderungen sind erst nach Deployment auf der öffentlichen Seite wirksam. Für eine belastbare Vorher/Nachher-Aussage dort zusätzlich TTFB, LCP und reale Manager-Navigation messen.

Wallet-Konfiguration und Grenzen stehen in `WALLET-SETUP.md`.

## Verifikation

- 48 Tests erfolgreich; abschließende Wallet-/Performance-Tests ebenfalls erfolgreich.
- Produktions-Build inklusive TypeScript-Prüfung erfolgreich.
- Zusammengefasste Sitzungsabfrage mit PostgreSQL EXPLAIN validiert, ohne Ausführung der Schreiboperation.
- Lokaler Produktionsserver: Startseite, Manager-Login und Registrierung liefern HTTP 200.
- Bildoptimierung geprüft: 640px WebP 37.870 Bytes statt 1.062.982 Bytes Original (rund 96 % weniger).
- Anzahl vorhandener Button-/Link-Elemente in den bearbeiteten Ansichten per TypeScript-AST verglichen: keine entfernt. Kein vollständiger visueller oder angemeldeter Browser-End-to-End-Test.
- Echte Wallet-Ausgabe und mobile Abnahme bleiben bis zur Zugangsdaten-Einrichtung offen.
