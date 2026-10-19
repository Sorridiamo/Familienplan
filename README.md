# Familienplan

Betreuungs- und Anwesenheitsplan fuer die Kinder, Oktober–Dezember 2026.

Statische Web-App (HTML/CSS/JavaScript), gehostet ueber GitHub Pages.
Die Eintraege werden in einem **eigenen, komplett getrennten** Firebase-Projekt
(`familienplan-c9a35`) gespeichert und ueber alle Geraete synchronisiert.
Faellt die Cloud aus, laeuft die App automatisch nur lokal im Browser weiter.

## Dateien

- `index.html` – Geruest der Seite
- `style.css` – Gestaltung (inkl. Druck-Layout A4 quer)
- `firebase-config.js` – Firebase-Anbindung (anonyme Anmeldung)
- `store.js` – Speicher-Logik (Cloud + lokaler Fallback)
- `script.js` – Kalender-Aufbau und Bedienung
- `toolbar.js` – Statusanzeige, Sicherung/Wiederherstellung
- `test_store.js` – lokale Tests der Speicher-Logik (`node test_store.js`)

## Hinweis

Das Repo ist oeffentlich, damit GitHub Pages ohne Bezahlplan funktioniert.
Die Firebase-Konfiguration ist dadurch sichtbar – das ist bei Firebase-Web-Apps
normal. Der Zugriff ist bewusst niederschwellig (anonyme Anmeldung), daher
sollte der Link nur gezielt in der Familie geteilt werden.
