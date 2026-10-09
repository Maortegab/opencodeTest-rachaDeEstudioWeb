# MEMORY.md

Contexto de la aplicación. Mantener bajo 50 líneas: **borra lo que ya no sea cierto o ya esté en `AGENTS.md`**
(allí viven reglas de trabajo, estilo y trampas). Responde "cómo es esta app y dónde está cada cosa".

## Qué es

Contador de rachas de estudio: el usuario registra sesiones (tema + minutos) y la app calcula los
días consecutivos de estudio. Sin backend, login ni usuarios: una sola racha local por navegador.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Estructura. 3 tarjetas: racha+stats, formulario, tabla. 19 ids que `app.js` busca por nombre. |
| `styles.css` | Grid responsive + variables de tema claro/oscuro. Sin frameworks. |
| `app.js` | Toda la lógica: storage, racha, validación, render. Script global, sin módulos. |

## Datos

Clave `localStorage`: `studyStreak.sessions`. Un array de sesiones:

```js
{ id: string, topic: string, minutes: number, date: "YYYY-MM-DD", createdAt: ISO/UTC }
```

- `date` es la clave de día en **hora local** (`toDateKey`); `createdAt` es UTC y solo ordena sesiones
  dentro del mismo día. La fecha la pone la app en el submit; el usuario nunca la escribe.

## Puntos de entrada (app.js)

- `loadSessions()` / `saveSessions()` — leer y escribir storage, con filtro de entradas malformadas.
- `calculateStats(sessions, today)` — función pura (hoy se pasa explícito, `render()` lo lee una vez).
  Devuelve `{streak, best, alive, today, weekStart, weekMinutes, totalMinutes, totalDays,
  daysSinceLast, cells}`: `cells` son 35 descriptores `{dateKey, minutes, level, future, isToday}`
  de la ventana lunes-hace-4-semanas → hoy, con `heatLevel` → 0-4 (0 sin registro, 1 ≥1 min,
  2 ≥30, 3 ≥60, 4 ≥120). Ignora sesiones con fecha futura. **El corazón de la app.**
- `render()` — recalcula stats y redibuja todo el DOM desde cero, sin diff. Se llama tras cada cambio.
- `validate()` — límites de tema (1–80) y minutos (entero 1–1440).

## Racha y semana (resumen)

La racha cuenta **días únicos** sobre un `Set` de fechas ordenadas; hoy o ayer la mantienen viva
(sin hoy, `alive: false` = "en riesgo"). `weekStartKey()` saca el **lunes** de la semana
(`(getDay() + 6) % 7`) y `weekMinutes` suma minutos con `weekStart <= date <= hoy`: al revés que
la racha, **acumula minutos y no deduplica días**.

## Verificar cambios
`node --check app.js` (sintaxis) y `node --test` (tests en `tests/`, harness `tests/load-app.js`). UI con doble clic (`file://`).
