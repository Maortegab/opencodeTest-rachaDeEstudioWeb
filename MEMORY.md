# MEMORY.md

Contexto de la aplicación. Mantener bajo 50 líneas: **borra lo que ya no sea cierto o ya esté en
`AGENTS.md`** (allí viven reglas de trabajo, estilo y trampas). Este archivo responde "cómo es esta
app y dónde está cada cosa".

## Qué es

Contador de rachas de estudio. El usuario registra sesiones (tema + minutos) y la app calcula
cuántos días consecutivos lleva estudiando. Sin backend, sin login, sin usuarios: una sola racha
local por navegador.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Estructura. 3 tarjetas: racha+stats, formulario, tabla. 16 ids que `app.js` busca por nombre. |
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
- `calculateStats(sessions)` — función pura y sin DOM. Devuelve `{streak, best, alive, today, weekStart,
  weekMinutes, totalMinutes, totalDays}`. **Es el corazón de la app y la única parte con lógica real.**
- `render()` — recalcula stats y redibuja todo el DOM desde cero, sin diff. Se llama tras cada cambio.
- `validate()` — límites de tema (1–80) y minutos (entero 1–1440).

## Racha y semana (resumen)

La racha cuenta **días únicos** sobre un `Set` de fechas ordenadas; hoy o ayer la mantienen viva
(sin hoy, `alive: false` = "en riesgo"), y `best` se barre aparte. `weekStartKey()` saca el **lunes**
de la semana de una fecha (`(getDay() + 6) % 7`) y `weekMinutes` suma los minutos de las sesiones con
`weekStart <= date <= hoy`: al revés que la racha, **acumula minutos y no deduplica días**. Se muestra
como cuarto item del `<dl class="stats">`.

## Verificar cambios

Sin runner de tests ni linter: `node --check app.js` para sintaxis, y el harness de `new Function`
descrito en `AGENTS.md` para probar `calculateStats` (añade un `Date` falso para fijar el "hoy" de los
fixtures). La UI solo se verifica abriendo `index.html` con doble clic (`file://`).
