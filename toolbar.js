/* toolbar.js — Status- und Datenverwaltung fuer den Familienplan.
   Zeigt an, dass gespeichert wurde, und erlaubt Sicherung / Wiederherstellung
   der Eintraege als Datei (zum Weitergeben oder auf einen anderen Rechner). */

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

  function addButton(label, handler) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "data-btn";
    btn.textContent = label;
    btn.addEventListener("click", handler);
    bar.appendChild(btn);
    return btn;
  }

  addButton("Sicherung speichern", function () {
    var blob = new Blob([FamStore.exportJson()], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "familienplan-sicherung.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        FamStore.importJson(String(reader.result));
        applyStateToDom();
      } catch (e) {
        window.alert("Die Datei konnte nicht gelesen werden: " + e.message);
      }
    };
    reader.readAsText(file);
    fileInput.value = "";
  });
  bar.appendChild(fileInput);

  addButton("Sicherung laden", function () {
    fileInput.click();
  });

  addButton("Alles zuruecksetzen", function () {
    if (!window.confirm("Wirklich alle Eintraege loeschen? Das gilt auch fuer alle anderen Geraete und kann nicht rueckgaengig gemacht werden.")) return;
    FamStore.clearAll();
    applyStateToDom();
  });
})();
