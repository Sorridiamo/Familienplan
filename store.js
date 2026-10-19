/* store.js — Speicher-Schicht fuer den Familienplan.

   Zwei Ebenen:
   1. localStorage  — sofort da, funktioniert offline, ueberlebt Neustart.
   2. Firebase RTDB — gemeinsamer Stand ueber alle Geraete. Aenderungen
      erscheinen live auf dem iPad der Tochter und umgekehrt.

   Die Cloud ist die Wahrheit, sobald sie verbunden ist. Ohne Cloud laeuft
   alles unveraendert lokal weiter — es geht nie etwas verloren.

   Feldnamen enthalten nur Buchstaben und Unterstriche, weil Firebase-
   Schluessel keine Punkte erlauben: tag_nacht_weg, nacht_mami, note, ...

   Datenformat (lokal und in der Cloud identisch):
   { "2026-10-05": { "tag_nacht_weg": true, "note": "Oma kommt" } } */

var FamStore = (function () {
  var STORAGE_KEY = "familienplan_v2";
  var LEGACY_KEY = "familienplan_v1";

  var state = {};
  var statusListeners = [];
  var changeListeners = [];
  var dbRef = null;
  var applyingRemote = false;

  // --- lokaler Speicher -----------------------------------------------------

  function readLocal() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) || {};
      // Einmalige Migration: alte Feldnamen mit Punkten -> Unterstriche
      var legacy = window.localStorage.getItem(LEGACY_KEY);
      if (!legacy) return {};
      var old = JSON.parse(legacy) || {};
      var migrated = {};
      Object.keys(old).forEach(function (dateKey) {
        migrated[dateKey] = {};
        Object.keys(old[dateKey]).forEach(function (field) {
          migrated[dateKey][field.replace(/\./g, "_")] = old[dateKey][field];
        });
      });
      return migrated;
    } catch (e) {
      console.warn("Familienplan: Laden fehlgeschlagen", e);
      return {};
    }
  }

  function writeLocal() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn("Familienplan: Speichern fehlgeschlagen", e);
      return false;
    }
  }

  function notifyStatus(text, kind) {
    for (var i = 0; i < statusListeners.length; i++) {
      try { statusListeners[i](text, kind || "info"); } catch (e) { console.warn(e); }
    }
  }

  function notifyChanged() {
    for (var i = 0; i < changeListeners.length; i++) {
      try { changeListeners[i](); } catch (e) { console.warn(e); }
    }
  }

  // --- Cloud ---------------------------------------------------------------

  function planRef() {
    if (dbRef) return dbRef;
    try {
      if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length) {
        var id = (typeof PLAN_ID !== "undefined") ? PLAN_ID : "plan";
        dbRef = firebase.database().ref("familienplan/" + id + "/days");
        return dbRef;
      }
    } catch (e) {
      console.warn("Familienplan: keine Datenbank-Verbindung", e);
    }
    return null;
  }

  function initCloud() {
    var ref = planRef();
    if (!ref) { notifyStatus("Nur lokal gespeichert", "local"); return; }

    ref.on("value", function (snapshot) {
      var data = snapshot.val();

      if (data === null) {
        // Cloud noch leer -> aktuellen lokalen Stand hochladen
        if (Object.keys(state).length > 0) {
          ref.set(state).catch(function (e) { cloudError(e); });
        }
        notifyStatus("Cloud verbunden", "cloud");
        return;
      }

      applyingRemote = true;
      state = data;
      applyingRemote = false;

      writeLocal();
      notifyChanged();
      notifyStatus("Cloud verbunden", "cloud");
    }, function (err) {
      cloudError(err);
    });
  }

  function cloudError(err) {
    console.warn("Familienplan: Cloud-Fehler", err);
    if (typeof FB_DIAG !== "undefined") {
      FB_DIAG.status = "Zugriff verweigert";
      FB_DIAG.code = (err && err.code) || "db-error";
      FB_DIAG.detail = (err && err.message) || String(err);
    }
    notifyStatus("Cloud nicht erreichbar - nur lokal", "error");
  }

  function pushField(dateKey, field, value, isEmpty) {
    var ref = planRef();
    if (!ref || applyingRemote) return;
    var target = ref.child(dateKey).child(field);
    var op = isEmpty ? target.remove() : target.set(value);
    if (op && op.catch) op.catch(function (e) { cloudError(e); });
  }

  // --- oeffentliche API ----------------------------------------------------

  function get(dateKey, field) {
    var day = state[dateKey];
    if (!day) return undefined;
    return day[field];
  }

  function set(dateKey, field, value) {
    var isEmpty = (value === false || value === "" || value === null || value === undefined);

    if (isEmpty) {
      if (state[dateKey]) {
        delete state[dateKey][field];
        if (Object.keys(state[dateKey]).length === 0) delete state[dateKey];
      }
    } else {
      if (!state[dateKey]) state[dateKey] = {};
      state[dateKey][field] = value;
    }

    var ok = writeLocal();
    pushField(dateKey, field, value, isEmpty);
    notifyStatus(ok ? "Gespeichert" : "Speichern fehlgeschlagen", ok ? "saved" : "error");
  }

  function clearAll() {
    state = {};
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { console.warn(e); }
    try { window.localStorage.removeItem(LEGACY_KEY); } catch (e) { console.warn(e); }
    var ref = planRef();
    if (ref) {
      var op = ref.remove();
      if (op && op.catch) op.catch(function (e) { cloudError(e); });
    }
    notifyStatus("Zurueckgesetzt", "info");
  }

  function exportJson() {
    return JSON.stringify(state, null, 2);
  }

  function importJson(text) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Ungueltiges Format");
    }
    state = parsed;
    writeLocal();
    var ref = planRef();
    if (ref) {
      var op = ref.set(state);
      if (op && op.catch) op.catch(function (e) { cloudError(e); });
    }
    notifyChanged();
    notifyStatus("Sicherung geladen", "info");
  }

  function start() {
    state = readLocal();
    writeLocal();
    if (typeof FB_READY === "function") {
      FB_READY(function (signedIn) {
        if (signedIn) initCloud();
        else notifyStatus("Nur lokal gespeichert", "local");
      });
    } else {
      notifyStatus("Nur lokal gespeichert", "local");
    }
  }

  return {
    get: get,
    set: set,
    clearAll: clearAll,
    exportJson: exportJson,
    importJson: importJson,
    onStatus: function (cb) { if (typeof cb === "function") statusListeners.push(cb); },
    onChanged: function (cb) { if (typeof cb === "function") changeListeners.push(cb); },
    start: start
  };
})();
