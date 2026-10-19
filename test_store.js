// test_store.js — prueft die Speicher-Logik von store.js ohne Browser.
// Simuliert localStorage und laedt store.js im selben Kontext.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeLocalStorage() {
  const data = {};
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: k => { delete data[k]; },
    _raw: data,
  };
}

function loadStore(ls) {
  const code = fs.readFileSync(path.join(__dirname, 'store.js'), 'utf8');
  const sandbox = { window: { localStorage: ls }, console, PLAN_ID: 'test-plan' };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  sandbox.FamStore.start(); // liest localStorage; ohne FB_READY bleibt es lokal
  return sandbox.FamStore;
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + ' -> got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected)); }
}

// --- Runde 1: schreiben ---
const ls = makeLocalStorage();
let store = loadStore(ls);

check('leeres Feld ist undefined', store.get('2026-10-05', 'note'), undefined);

store.set('2026-10-05', 'tag_nacht_weg', true);
store.set('2026-10-05', 'nacht_mami', true);
store.set('2026-10-05', 'note', 'Oma kommt');

check('checkbox gesetzt', store.get('2026-10-05', 'tag_nacht_weg'), true);
check('zweite checkbox gesetzt', store.get('2026-10-05', 'nacht_mami'), true);
check('notiz gesetzt', store.get('2026-10-05', 'note'), 'Oma kommt');
check('nachbartag unberuehrt', store.get('2026-10-06', 'tag_nacht_weg'), undefined);

// --- Runde 2: neu laden (neuer Kontext, gleicher Speicher) = Reload ---
store = loadStore(ls);
check('nach Reload: checkbox', store.get('2026-10-05', 'tag_nacht_weg'), true);
check('nach Reload: notiz', store.get('2026-10-05', 'note'), 'Oma kommt');
check('nach Reload: nachbartag leer', store.get('2026-10-06', 'note'), undefined);

// --- Abwaehlen entfernt das Feld, Tag bleibt solange andere Felder da sind ---
store.set('2026-10-05', 'tag_nacht_weg', false);
check('abgewaehlt -> undefined', store.get('2026-10-05', 'tag_nacht_weg'), undefined);
check('andere Felder bleiben', store.get('2026-10-05', 'note'), 'Oma kommt');

// --- Leerer Tag verschwindet komplett aus dem Speicher ---
store.set('2026-10-05', 'nacht_mami', false);
store.set('2026-10-05', 'note', '');
const persisted = JSON.parse(ls.getItem('familienplan_v2'));
check('leerer Tag entfernt', Object.keys(persisted), []);

// --- Export / Import ---
store.set('2026-12-24', 'note', 'Heiligabend');
const backup = store.exportJson();
store.clearAll();
check('nach clearAll leer', store.get('2026-12-24', 'note'), undefined);
store.importJson(backup);
check('nach Import wiederhergestellt', store.get('2026-12-24', 'note'), 'Heiligabend');

// --- Import von Muell wird abgelehnt ---
let threw = false;
try { store.importJson('"nur ein string"'); } catch (e) { threw = true; }
check('ungueltiger Import wirft', threw, true);
threw = false;
try { store.importJson('[1,2,3]'); } catch (e) { threw = true; }
check('Array-Import wirft', threw, true);
check('Daten nach fehlgeschlagenem Import intakt', store.get('2026-12-24', 'note'), 'Heiligabend');

// --- Migration: alte Feldnamen mit Punkten werden umgestellt ---
const ls2 = makeLocalStorage();
ls2.setItem('familienplan_v1', JSON.stringify({
  '2026-11-03': { 'tag.nacht.weg': true, 'nacht.simeo': true, 'note': 'Altbestand' }
}));
const migrated = loadStore(ls2);
check('migriert: checkbox', migrated.get('2026-11-03', 'tag_nacht_weg'), true);
check('migriert: zweite checkbox', migrated.get('2026-11-03', 'nacht_simeo'), true);
check('migriert: notiz', migrated.get('2026-11-03', 'note'), 'Altbestand');
check('migriert: v2 geschrieben', !!ls2.getItem('familienplan_v2'), true);

// --- Kein Feldname enthaelt Zeichen, die Firebase verbietet ---
const allFields = Object.keys(JSON.parse(ls2.getItem('familienplan_v2'))['2026-11-03']);
const badFields = allFields.filter(f => /[.$#\[\]\/]/.test(f));
check('keine Firebase-verbotenen Zeichen', badFields, []);

console.log('\n' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
