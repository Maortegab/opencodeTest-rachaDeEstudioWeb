const test = require("node:test");
const assert = require("node:assert");

const { loadApp } = require("./load-app.js");

const app = loadApp();
const TODAY = "2026-10-08";

function session(date, minutes, suffix = "") {
  return {
    id: `${date}-${suffix}`,
    topic: "tema",
    minutes,
    date,
    createdAt: `${date}T09:00:00.000Z`,
  };
}

function nonFuture(stats) {
  return stats.cells.filter((cell) => !cell.future);
}

test("heatLevel: fronteras exactas de los 4 umbrales", () => {
  assert.strictEqual(app.heatLevel(1), 1);
  assert.strictEqual(app.heatLevel(29), 1);
  assert.strictEqual(app.heatLevel(30), 2);
  assert.strictEqual(app.heatLevel(59), 2);
  assert.strictEqual(app.heatLevel(60), 3);
  assert.strictEqual(app.heatLevel(119), 3);
  assert.strictEqual(app.heatLevel(120), 4);
  assert.strictEqual(app.heatLevel(1440), 4);
});

test("heatLevel: sin registro devuelve 0", () => {
  assert.strictEqual(app.heatLevel(0), 0);
});

test("ventana: 35 celdas desde el lunes hace 4 semanas hasta la semana en curso", () => {
  const stats = app.calculateStats([], TODAY);
  assert.strictEqual(stats.cells.length, 35);
  assert.strictEqual(stats.cells[0].dateKey, "2026-09-07");
  assert.strictEqual(stats.cells[28].dateKey, "2026-10-05");
  assert.strictEqual(stats.cells[34].dateKey, "2026-10-11");
  const todayCells = stats.cells.filter((cell) => cell.isToday);
  assert.strictEqual(todayCells.length, 1);
  assert.strictEqual(todayCells[0].dateKey, TODAY);
});

test("ventana: solo existen los días ≤ hoy (32 jue, 29 lun, 35 dom)", () => {
  assert.strictEqual(nonFuture(app.calculateStats([], "2026-10-08")).length, 32);
  assert.strictEqual(nonFuture(app.calculateStats([], "2026-10-05")).length, 29);
  assert.strictEqual(nonFuture(app.calculateStats([], "2026-10-11")).length, 35);
});

test("ventana: las celdas futuras no aportan minutos ni nivel", () => {
  const stats = app.calculateStats([session("2026-10-10", 60)], TODAY);
  const future = stats.cells.find((cell) => cell.dateKey === "2026-10-10");
  assert.strictEqual(future.future, true);
  assert.strictEqual(future.minutes, 0);
  assert.strictEqual(future.level, 0);
});

test("nivel: varias sesiones del mismo día se suman (25 + 35 → nivel 3)", () => {
  const stats = app.calculateStats(
    [session("2026-10-07", 25, "a"), session("2026-10-07", 35, "b")],
    TODAY
  );
  const cell = stats.cells.find((c) => c.dateKey === "2026-10-07");
  assert.strictEqual(cell.minutes, 60);
  assert.strictEqual(cell.level, 3);
});

test("cellTitle: minutos en formato de horas y celda sin registro", () => {
  assert.strictEqual(app.cellTitle("2026-10-12", 90), "12 oct 2026 · 1 h 30 min");
  assert.strictEqual(app.cellTitle("2026-10-12", 2880), "12 oct 2026 · 48 h");
  assert.strictEqual(app.cellTitle("2026-10-12", 0), "12 oct 2026 · sin registro");
});

test("heatLabel: mapa vacío sin undefined ni NaN", () => {
  const label = app.heatLabel(app.calculateStats([], TODAY));
  assert.ok(!label.includes("undefined"));
  assert.ok(!label.includes("NaN"));
  assert.ok(label.includes("Sin actividad en las últimas 5 semanas"));
  assert.ok(label.includes("Sin registros todavía"));
});

test("heatLabel: sesiones anteriores a la ventana", () => {
  const label = app.heatLabel(app.calculateStats([session("2026-08-01", 45)], TODAY));
  assert.ok(label.includes("Sin actividad en las últimas 5 semanas"));
  assert.ok(label.includes("Racha rota"));
});

test("heatLabel: días y minutos de la ventana más mensaje de racha", () => {
  const label = app.heatLabel(app.calculateStats([session("2026-10-07", 60)], TODAY));
  assert.ok(label.includes("Últimas 5 semanas"));
  assert.ok(label.includes("1 día con sesión"));
  assert.ok(label.includes("1 h"));
  assert.ok(label.includes("Racha"));
});

test("regresión: racha viva con sesión de hoy y de ayer", () => {
  const stats = app.calculateStats(
    [
      session("2026-10-08", 30, "a"),
      session("2026-10-07", 30, "b"),
      session("2026-10-06", 30, "c"),
    ],
    TODAY
  );
  assert.strictEqual(stats.streak, 3);
  assert.strictEqual(stats.alive, true);
  assert.strictEqual(stats.best, 3);
});

test("regresión: sin sesión hoy pero sí ayer la racha no vale 0", () => {
  const stats = app.calculateStats([session("2026-10-07", 30)], TODAY);
  assert.strictEqual(stats.streak, 1);
  assert.strictEqual(stats.alive, false);
});

test("regresión: hueco reinicia la racha; la mejor se calcula aparte", () => {
  const stats = app.calculateStats(
    [session("2026-10-05", 30, "a"), session("2026-10-06", 30, "b")],
    TODAY
  );
  assert.strictEqual(stats.streak, 0);
  assert.strictEqual(stats.best, 2);
});

test("regresión: weekMinutes acumula todas las sesiones de la semana", () => {
  const stats = app.calculateStats(
    [
      session("2026-10-06", 25, "a"),
      session("2026-10-06", 35, "b"),
      session("2026-10-01", 100, "c"),
    ],
    TODAY
  );
  assert.strictEqual(stats.weekMinutes, 60);
  assert.strictEqual(stats.totalMinutes, 160);
});
