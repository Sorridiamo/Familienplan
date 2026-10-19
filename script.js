const MONTH_NAMES = [
  "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function mondayFirstWeekday(year, monthIndex, day) {
  const jsDay = new Date(year, monthIndex, day).getDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun
}

const DAY_PARTS = ["Vormittag", "Mittag", "Nachmittag", "Nacht"];

function dateKeyOf(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return year + "-" + m + "-" + d;
}

function headerRow(col1, col2) {
  const row = document.createElement("div");
  row.className = "grid-row grid-header";
  row.innerHTML =
    "<span class=\"part-label\"></span>" +
    "<span class=\"col-title\">" + col1 + "</span>" +
    "<span class=\"col-title\">" + col2 + "</span>";
  return row;
}

// label      = sichtbarer Zeilentitel
// fieldA/B   = Speicher-Feldnamen der linken / rechten Checkbox
// markWeg    = true bei der Zeile, die die blaue Faerbung steuert
function checkRow(label, fieldA, fieldB, markWeg) {
  const row = document.createElement("div");
  row.className = "grid-row";

  const labelEl = document.createElement("span");
  labelEl.className = "part-label";
  labelEl.textContent = label;
  row.appendChild(labelEl);

  [fieldA, fieldB].forEach(function (field) {
    const cellEl = document.createElement("span");
    cellEl.className = "col-cell";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.dataset.field = field;
    if (markWeg && field === fieldB) box.classList.add("nacht-weg");
    cellEl.appendChild(box);
    row.appendChild(cellEl);
  });

  return row;
}

function buildDayCell(dayNumber, isWeekend, dateKey) {
  const cell = document.createElement("div");
  cell.className = "day" + (isWeekend ? " weekend" : "");
  cell.dataset.date = dateKey;

  const num = document.createElement("div");
  num.className = "day-num";
  num.textContent = String(dayNumber);
  cell.appendChild(num);

  const grid = document.createElement("div");
  grid.className = "day-grid-table";

  // Block 1: Tageszeiten mit Spalten zuhause / weg
  grid.appendChild(headerRow("zuhause", "weg"));
  DAY_PARTS.forEach(function (part) {
    const slug = part.toLowerCase();
    grid.appendChild(checkRow(
      part,
      "tag_" + slug + "_zuhause",
      "tag_" + slug + "_weg",
      part === "Nacht"
    ));
  });

  // Block 2: Nacht-Betreuung mit Spalten Mami / Simeo
  grid.appendChild(headerRow("Mami", "Simeo"));
  grid.appendChild(checkRow("Nacht", "nacht_mami", "nacht_simeo", false));
  grid.appendChild(checkRow("Nacht Backup", "backup_mami", "backup_simeo", false));

  cell.appendChild(grid);

  const backup = document.createElement("div");
  backup.className = "field backup-field";
  const noteInput = document.createElement("input");
  noteInput.type = "text";
  noteInput.placeholder = "Notiz / weiteres Backup";
  noteInput.dataset.field = "note";
  backup.appendChild(noteInput);
  cell.appendChild(backup);

  wireDayCell(cell, dateKey);
  return cell;
}

// Gespeicherte Werte einsetzen und jede Aenderung zurueckschreiben
function wireDayCell(cell, dateKey) {
  cell.querySelectorAll("input[data-field]").forEach(function (input) {
    const field = input.dataset.field;

    if (input.type === "checkbox") {
      input.addEventListener("change", function () {
        FamStore.set(dateKey, field, input.checked);
        refreshHighlight(cell);
      });
    } else {
      input.addEventListener("input", function () {
        FamStore.set(dateKey, field, input.value.trim());
      });
    }
  });

  applyCellState(cell, dateKey);
}

function refreshHighlight(cell) {
  const nachtWeg = cell.querySelector("input.nacht-weg");
  cell.classList.toggle("nacht-away", !!(nachtWeg && nachtWeg.checked));
}

// Werte aus dem Speicher in die Felder einer Tageszelle schreiben.
// Wird beim Aufbau und nach jeder Cloud-Aenderung aufgerufen. Das Feld, in
// dem gerade getippt wird, bleibt unberuehrt, damit der Cursor nicht springt.
function applyCellState(cell, dateKey) {
  cell.querySelectorAll("input[data-field]").forEach(function (input) {
    const saved = FamStore.get(dateKey, input.dataset.field);

    if (input.type === "checkbox") {
      input.checked = saved === true;
    } else {
      if (document.activeElement === input) return;
      input.value = typeof saved === "string" ? saved : "";
    }
  });
  refreshHighlight(cell);
}

// Alle Tageszellen neu aus dem Speicher befuellen (nach Cloud-Aenderung)
function applyStateToDom() {
  document.querySelectorAll(".day[data-date]").forEach(function (cell) {
    applyCellState(cell, cell.dataset.date);
  });
}

function buildEmptyCell() {
  const cell = document.createElement("div");
  cell.className = "day empty";
  return cell;
}

function printSingleMonth(containerId) {
  document.body.classList.add("print-single-month");
  document.querySelectorAll(".month-sheet").forEach(function (el) {
    el.classList.toggle("print-active", el.id === containerId);
  });
  window.print();
}

window.addEventListener("afterprint", function () {
  document.body.classList.remove("print-single-month");
  document.querySelectorAll(".month-sheet").forEach(function (el) {
    el.classList.remove("print-active");
  });
});

function renderMonth(containerId, year, monthIndex) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const titleRow = document.createElement("div");
  titleRow.className = "month-title-row";

  const title = document.createElement("h2");
  title.className = "month-title";
  title.textContent = MONTH_NAMES[monthIndex] + " " + year;
  titleRow.appendChild(title);

  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.className = "print-btn";
  printBtn.textContent = "🖨️ Drucken (PDF)";
  printBtn.addEventListener("click", function () {
    printSingleMonth(containerId);
  });
  titleRow.appendChild(printBtn);

  container.appendChild(titleRow);

  const weekdayRow = document.createElement("div");
  weekdayRow.className = "weekday-row";
  WEEKDAY_LABELS.forEach(function (label) {
    const span = document.createElement("span");
    span.textContent = label;
    weekdayRow.appendChild(span);
  });
  container.appendChild(weekdayRow);

  const grid = document.createElement("div");
  grid.className = "day-grid";

  const totalDays = daysInMonth(year, monthIndex);
  const leadingBlanks = mondayFirstWeekday(year, monthIndex, 1);

  for (let i = 0; i < leadingBlanks; i++) {
    grid.appendChild(buildEmptyCell());
  }

  for (let day = 1; day <= totalDays; day++) {
    const weekdayIdx = mondayFirstWeekday(year, monthIndex, day);
    const isWeekend = weekdayIdx === 5 || weekdayIdx === 6;
    grid.appendChild(buildDayCell(day, isWeekend, dateKeyOf(year, monthIndex, day)));
  }

  container.appendChild(grid);
}

// Reihenfolge ist wichtig: erst Speicher lesen, dann rendern, damit die
// Felder direkt mit den gespeicherten Werten aufgebaut werden.
FamStore.onChanged(applyStateToDom);
FamStore.start();

renderMonth("month-2026-10", 2026, 9);
renderMonth("month-2026-11", 2026, 10);
renderMonth("month-2026-12", 2026, 11);
