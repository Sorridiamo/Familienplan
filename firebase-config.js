/* firebase-config.js — Firebase-Anbindung fuer den Familienplan.
   Eigenes, komplett getrenntes Firebase-Projekt "Familienplan"
   (familienplan-c9a35) — beruehrt weder Spielkiste/MiaLou noch den
   Haushalt-Wochenplan. Eigene Datenbank, eigene Zugangsdaten, eigene Regeln.

   FB_READY(callback) ruft den Callback erst, wenn die anonyme Anmeldung
   durch ist. Parameter: true = Cloud nutzbar, false = nur lokaler Speicher. */

var firebaseConfig = {
  apiKey: "AIzaSyBEi3KVTvxR0ZqqZEdXYa9Eu75yiyMGvKQ",
  authDomain: "familienplan-c9a35.firebaseapp.com",
  databaseURL: "https://familienplan-c9a35-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "familienplan-c9a35",
  storageBucket: "familienplan-c9a35.firebasestorage.app",
  messagingSenderId: "1028274321962",
  appId: "1:1028274321962:web:31bb94193d00ba076b2153"
};

// Sichtbare Versionsnummer — erscheint klein in der Kopfleiste. Damit sieht
// man sofort, ob der Browser wirklich die neue Fassung geladen hat.
var APP_VERSION = 'v1.0';

// Welcher Plan wird bearbeitet? Ein eigener Schluessel pro Zeitraum, damit
// spaetere Plaene (z.B. 2027) den jetzigen nicht ueberschreiben.
var PLAN_ID = 'okt-dez-2026';

// Diagnose: hier landet der letzte Verbindungsfehler in Klartext.
var FB_DIAG = { status: 'startet', code: '', detail: '' };

var FB_READY = (function () {
  var resolved = false;
  var result = false;
  var waiting = [];

  function done(ok) {
    if (resolved) return;
    resolved = true;
    result = ok;
    for (var i = 0; i < waiting.length; i++) {
      try { waiting[i](ok); } catch (e) { console.warn(e); }
    }
    waiting = [];
  }

  if (typeof firebase === 'undefined') {
    FB_DIAG.status = 'SDK nicht geladen';
    FB_DIAG.code = 'no-sdk';
    FB_DIAG.detail = 'Firebase-SDK fehlt (offline?). Plan laeuft nur lokal.';
    done(false);
  }

  if (!resolved) {
    try {
      firebase.initializeApp(firebaseConfig);
      // App Check ist fuer dieses Projekt noch nicht eingerichtet (eigener
      // reCAPTCHA-Key noetig). Ohne aktivierte Durchsetzung in der Firebase
      // Console ist das unproblematisch — wird spaeter nachgeruestet.
    } catch (e) {
      console.warn('Firebase konnte nicht initialisiert werden:', e);
      FB_DIAG.status = 'Start fehlgeschlagen';
      FB_DIAG.code = (e && e.code) || 'init-error';
      FB_DIAG.detail = (e && e.message) || String(e);
      done(false);
    }
  }

  if (!resolved) {
    try {
      firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          FB_DIAG.status = 'verbunden';
          FB_DIAG.code = '';
          FB_DIAG.detail = 'Anonyme Anmeldung erfolgreich.';
          done(true);
        }
      });
      firebase.auth().signInAnonymously().catch(function (err) {
        console.warn('Anonyme Anmeldung fehlgeschlagen:', err);
        FB_DIAG.status = 'Anmeldung fehlgeschlagen';
        FB_DIAG.code = (err && err.code) || 'auth-error';
        FB_DIAG.detail = (err && err.message) || String(err);
        done(false);
      });
      // Sicherheitsnetz: nach 8 Sekunden lokal weiterlaufen statt haengen.
      setTimeout(function () {
        if (!resolved) {
          FB_DIAG.status = 'Zeitueberschreitung';
          FB_DIAG.code = 'timeout';
          FB_DIAG.detail = 'Keine Antwort von Firebase nach 8 Sekunden.';
        }
        done(false);
      }, 8000);
    } catch (e) {
      console.warn('Firebase Auth nicht verfuegbar:', e);
      FB_DIAG.status = 'Anmeldedienst fehlt';
      FB_DIAG.code = (e && e.code) || 'auth-missing';
      FB_DIAG.detail = (e && e.message) || String(e);
      done(false);
    }
  }

  return function (cb) {
    if (typeof cb !== 'function') return;
    if (resolved) cb(result);
    else waiting.push(cb);
  };
})();
