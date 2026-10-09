# Plan de implementación — Mapa de calor (spec 001)

## 1. Archivos: creación, modificación y responsabilidad

| Archivo | Acción | Responsabilidad | RF |
|---|---|---|---|
| `specs/001-heat-map/plan.md` | crear | este plan | — |
| `index.html` | modificar | Etiquetas Lun…Dom a la izquierda del mapa y leyenda de 5 muestras: ambos hermanos fuera del `role="img"`, **sin `id` ni `aria-hidden`** (contrato de 19 ids intacto). Orden: mapa → leyenda → "Esta semana: X" | RF-1, RF-3, RF-6 |
| `styles.css` | modificar | Variables `--heat-empty`, `--heat-1`…`--heat-4` en `:root` y en el bloque oscuro; grid de 7 filas (`grid-template-rows` + `grid-auto-flow: column`); `[data-level]` → `var(--heat-N)`; anillo `:has()` con `data-row`/`data-col` (sin tocar el `outline` de hoy); celdas ≥20 px a 320 px sin scroll; transición ≤200 ms + `prefers-reduced-motion` | RF-1, RF-2 (pintado), RF-3, RF-5, RNF-3/4/8/9 |
| `app.js` | modificar | Toda la lógica pura + pintado. `render()` lee el reloj una sola vez y delega | RF-2, RF-4, RF-6, RNF-1 |
| `tests/load-app.js` | crear | Harness: lee `app.js`, quita el `render();` final con regex, inyecta `module` + stubs de `document`/`localStorage`/`crypto`/`confirm` con `new Function` y añade `module.exports`. Formaliza el truco de AGENTS.md. **No matchea `*.test.js`, no se ejecuta como test** | todas (node) |
| `tests/logic.test.js` | crear | Tests unitarios de las funciones puras | RF-1, RF-2, RF-4, RF-6 + regresión |
| `tests/contract.test.js` | crear | Contrato de ids + chequeos estáticos (sin `fetch`, sin `import`/`export`, sin `type="module"`) | RF-1 (CA ids), const. 4/5 |
| `specs/001-heat-map/spec.md` | modificar | Solo RNF-7: "sin test runner" → `node --test tests/` (const. 2) | RNF-7 |
| `docs/constitution.md` | modificar | Principio 1 enmendado (aprobado): *"…sin build. Los tests viven en `tests/` con `node --test` y no forman parte del stack."* (sigue en 8 líneas) | const. 1 |
| `AGENTS.md` | modificar | Líneas 4/8/89 "sin tests" → `node --test tests/`; párrafo del truco → apuntar a `tests/load-app.js`; **arreglar `docs7constitution.md` → `docs/constitution.md`** (referencia inexistente) | const. 2 |
| `MEMORY.md` | modificar | Firma `calculateStats(sessions, today)`, `cells`, `heatLevel`, comando de tests | const. 2 |

Sin `package.json`: los `.js` de `tests/` se tratan como CommonJS → `require` disponible, cero módulos ES, cero `npm install`.

## 2. Funciones puras necesarias (con "hoy" como parámetro)

| Función | Estado | Señal | RF |
|---|---|---|---|
| `toDateKey(date)` | ya existe | recibe `Date` | — |
| `shiftDays(dateKey, delta)` | ya existe | — | — |
| `weekStartKey(dateKey)` | ya existe | — | — |
| `heatLevel(minutes)` | **nueva** (sustituye a `ribbonLevel`) | devuelve 0 (sin registro) / 1 (1-29) / 2 (30-59) / 3 (60-119) / 4 (≥120) | RF-2 |
| `calculateStats(sessions, today)` | **firma cambia**: `today` (`YYYY-MM-DD`) explícito | devuelve los stats actuales + `cells`: **35** descriptores `{dateKey, minutes, level, future, isToday}`; `future` marca los días > hoy y `render()` los salta → así se cumplen a la vez RNF-1 ("35 descriptores") y RF-1 ("futuras no en el DOM") | RF-1, RF-2, RNF-1 |
| `cellTitle(dateKey, minutes)` | **nueva** | `"12 oct 2026 · 1 h 30 min"` / `"12 oct 2026 · sin registro"` | RF-4 |
| `heatLabel(stats)` | **nueva** | resumen español del `aria-label` sobre `stats.cells`; si no hay actividad en la ventana → `"sin actividad en las últimas 5 semanas"` + mensaje de racha | RF-6 |
| `formatMinutes`, `formatDate`, `streakMessage` | ya existen, puras | — | RF-4, RF-6 |

Impuras (excluidas, por diseño): `loadSessions`/`saveSessions` (storage; filtra con `toDateKey(new Date())`), `render()` (lee el reloj **una** vez → `calculateStats(sessions, today)` → pinta `data-row`/`data-col`, `title` vía `cellTitle`, `data-level` solo si `level > 0`, `aria-label` vía `heatLabel`), handlers del formulario.

## 3. Estrategia de test con `node --test`

- Comando: **`node --test tests/`** (Node v24.14.0 ya instalado; descubrimiento por patrón `*.test.js`).
- `tests/logic.test.js` — con `today` fijo `"2026-10-08"` (jueves, lunes de esa semana = `2026-10-05`, ventana desde `2026-09-07`):
  - **RF-1**: `cells.length === 35` siempre; no-futuras = 32 (jueves) / 29 (lunes) / 35 (domingo); primera celda = lunes hace 4 semanas; `isToday` solo en la última; ninguna fecha > `today`.
  - **RF-2**: fronteras de `heatLevel` 1/29/30/59/60/119/120/1440/0; día con 25+35 → nivel 3 y 60 min; día sin sesión → `level: 0`; sesión con `date` > `today` → no aporta minutos.
  - **RF-4**: `cellTitle` con 90 → `"… · 1 h 30 min"`, con 2880 → `"… · 48 h"`, sin registro → `"… · sin registro"`.
  - **RF-6**: `heatLabel` vacío sin `undefined`/`NaN`; solo sesiones antiguas → "sin actividad en las últimas 5 semanas"; caso normal incluye días, minutos y mensaje de racha.
  - **Regresión** (truco de AGENTS formalizado): racha con hoy / ayer-vida / hueco, `best`, `weekMinutes` con múltiples sesiones del mismo día.
- `tests/contract.test.js`: igualdad de conjuntos de ids `app.js` ↔ `index.html`; sin `fetch`/`XMLHttpRequest`/`import`/`export` en `app.js`; sin `type="module"` en `index.html`.
- **No ejecutable con node (manual en Chrome DevTools, RNF-7)**: RF-3 (leyenda en ambos temas), RF-5 (hover, toque pegajoso, limpieza al re-render, anillo sin tapar hoy), RNF-4 (320 px y 720 px), consola limpia.

## 4. Orden de ejecución y verificación final

1. `styles.css` e `index.html` (estructura y color) → 2. `app.js` (puras + render) → 3. tests → 4. docs (spec RNF-7, constitución, AGENTS, MEMORY) — **todo en un mismo commit** (const. 2, solo si se pide).
5. Verificar: `node --check app.js` · `node --test tests/` · DevTools (guardar sesión, hover/toque, temas, móvil, consola).

El `render()` con `data-row`/`data-col` y el `:has()` de CSS cubren RF-5 sin listeners (RNF-8 obligatorio). Sin cambios de comportamiento fuera de la spec.
