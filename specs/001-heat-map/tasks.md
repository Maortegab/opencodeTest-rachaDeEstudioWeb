# Tasks — Spec 001: Mapa de calor

Fuentes: `specs/001-heat-map/spec.md` + `specs/001-heat-map/plan.md`. Cumple `docs/constitution.md`.
Convenciones: textos en español, identificadores en inglés, sin comentarios en el código (AGENTS.md).

## T1 — Estructura del mapa y la leyenda (`index.html`)

- Etiquetas Lun…Dom a la izquierda del `ol#ribbon`, hermanas fuera del `role="img"`, sin `id` ni `aria-hidden`.
- Leyenda de 5 muestras ("sin registro", "<30 min", "30-59 min", "60-119 min", "120+ min") entre el mapa y el pie "Esta semana: X".
- **Hecho cuando**: el orden es mapa → leyenda → pie y el contrato de 19 ids sigue exacto.
- **Cubre**: RF-1 (orden/etiquetas), RF-3, RF-6 · const. 1, 6.

## T2 — Variables de color y pintado de niveles (`styles.css`)

- `--heat-empty`, `--heat-1`…`--heat-4` en `:root` y en el bloque oscuro, con las mezclas `color-mix` actuales.
- `.ribbon__day` → `var(--heat-empty)`; `[data-level]` → `var(--heat-N)`; las muestras de la leyenda consumen las mismas variables.
- **Cubre**: RF-2 (pintado), RF-3, RNF-3 · const. 6.

## T3 — Geometría semanal y responsive (`styles.css`)

- Grid de 7 filas (`grid-template-rows` + `grid-auto-flow: column`) + columna de etiquetas a la izquierda.
- Celdas ≥ 20 px a 320 px sin scroll horizontal; ancho completo desde 720 px.
- **Cubre**: RF-1, RNF-4.

## T4 — Resaltado de fila/columna (`styles.css`)

- `:has()` sobre `data-row`/`data-col` → `box-shadow: inset 0 0 0 2px var(--ink-strong)`; no toca `background` ni el `outline` de `.is-today`.
- Transición ≤ 200 ms anulada con `prefers-reduced-motion`; sin JS ni listeners (táctil = hover pegajoso nativo).
- **Cubre**: RF-5, RNF-8, RNF-9.

## T5 — Funciones puras (`app.js`)

- `heatLevel(minutes)` → 0/1-4 (sustituye a `ribbonLevel`).
- `calculateStats(sessions, today)` con `today` explícito → stats + `cells` (35 descriptores `{dateKey, minutes, level, future, isToday}`).
- `cellTitle(dateKey, minutes)` y `heatLabel(stats)`.
- Sin DOM, storage ni reloj dentro de estas funciones.
- **Cubre**: RF-1 (datos), RF-2, RF-4, RF-6, RNF-1 · const. 3.

## T6 — Render (`app.js`)

- `render()` lee el reloj una sola vez → `calculateStats(loadSessions(), today)`.
- Pinta cada celda con `data-row`/`data-col`, `data-level` solo si `level > 0`, salta las `future`, marca `is-today` y pone `title` con `cellTitle`; `aria-label` con `heatLabel(stats)`.
- Elimina del render la construcción de la ventana, `minutesByDay` y el uso de `ribbonLevel`.
- **Cubre**: RF-1 (DOM), RF-4, RF-5 (atributos), RF-6 · const. 3.

## T7 — Harness de tests (`tests/load-app.js`)

- Lee `app.js`, elimina el `render();` final con regex, inyecta `module` + stubs de `document`/`localStorage`/`crypto`/`confirm` vía `new Function` y añade `module.exports`.
- Nombre que no matchea `*.test.js`.
- **Cubre**: soporte de T8/T9 · const. 4 (cero dependencias).

## T8 — Tests de lógica (`tests/logic.test.js`)

- RF-1: ventana con `today` fijo `"2026-10-08"` (35 celdas; no-futuras 32/29/35; primera = lunes hace 4 semanas; `isToday` solo en la última).
- RF-2: fronteras 1/29/30/59/60/119/120/1440/0, suma 25+35 → nivel 3, fecha futura no aporta.
- RF-4: `cellTitle` con 90, 2880 y sin registro. RF-6: `heatLabel` vacío, solo antigüas y caso normal.
- Regresión: racha con hoy/ayer/hueco, `best`, `weekMinutes` con múltiples sesiones.
- **Cubre**: RF-1, RF-2, RF-4, RF-6 (automatizado), RNF-7.

## T9 — Tests de contrato (`tests/contract.test.js`)

- Igualdad de ids `app.js` ↔ `index.html`; sin `fetch`/`XMLHttpRequest`/`import`/`export` en `app.js`; sin `type="module"` en `index.html`.
- **Cubre**: RF-1 (CA ids), const. 4/5, RNF-7.

## T10 — Sincronización de docs (mismo commit)

- `spec.md`: RNF-7 → `node --test tests/`.
- `docs/constitution.md`: principio 1 enmendado ("los tests viven en `tests/` …").
- `AGENTS.md`: líneas 4/8/89 "sin tests" → comando; truco → `tests/load-app.js`; `docs7constitution.md` → `docs/constitution.md`.
- `MEMORY.md`: `calculateStats(sessions, today)`, `cells`, `heatLevel`, comando de tests.
- **Cubre**: const. 1, 2 · RNF-6, RNF-7.

## T11 — Verificación final

- `node --check app.js` · `node --test tests/` · DevTools: guardar sesión, hover, toque, re-render con puntero encima, ambos temas, 320 px y 720 px, móvil y consola limpia.
- Checklist de fechas (skill local-dates): `toDateKey` local, sin `toISOString`, sin milisegundos, sesión a las 00:30, cambio de hora, fechas futuras ignoradas.
- **Cubre**: RF-3 y RF-5 (manual), RNF-4, RNF-7.

Orden: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11.
El commit único (T10) solo si lo pides explícitamente (const. 2).
