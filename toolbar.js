/* toolbar.js — Statusanzeige fuer den Familienplan.
   Zeigt an, ob gerade in der Cloud oder nur lokal gespeichert wird. */

(function () {
  var bar = document.getElementById("data-toolbar");
  if (!bar) return;

  var status = document.createElement("span");
  status.className = "save-status";
  status.textContent = "Startet";
  bar.appendChild(status);

  // Letzter Dauerzustand (lokal / Cloud) — kurze Meldungen wie "Gespeichert"
  // werden darueber eingeblendet und fallen danach wieder darauf zurueck.
  var restingText = "Startet";
  var restingKind = "info";
  var timer = null;

  function paint(text, kind) {
    status.textContent = text;
    status.className = "save-status status-" + kind;
  }

  FamStore.onStatus(function (text, kind) {
    if (kind === "cloud" || kind === "local" || kind === "error") {
      restingText = text;
      restingKind = kind;
    }

    paint(text, kind);

    // Diagnose beim Hovern sichtbar machen, solange es nicht "cloud" ist.
    if (kind !== "cloud" && typeof FB_DIAG !== "undefined") {
      status.title = FB_DIAG.status + " (" + FB_DIAG.code + "): " + FB_DIAG.detail;
    } else {
      status.title = "";
    }

    if (timer) clearTimeout(timer);
    if (kind === "saved" || kind === "info") {
      timer = setTimeout(function () { paint(restingText, restingKind); }, 1600);
    }
  });

  if (typeof APP_VERSION !== "undefined") {
    var ver = document.createElement("span");
    ver.className = "app-version";
    ver.textContent = APP_VERSION;
    bar.appendChild(ver);
  }
})();
