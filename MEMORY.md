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
- `calculateStats(sessions)` — función pura y sin DOM. Devuelve `{streak, best, alive, today, weekStart,
  weekMinutes, totalMinutes, totalDays}`. **Es el corazón de la app y la única parte con lógica real.**
- `render()` — recalcula stats y redibuja todo el DOM desde cero, sin diff. Se llama tras cada cambio.
- `validate()` — límites de tema (1–80) y minutos (entero 1–1440).

## Racha y semana (resumen)

La racha cuenta **días únicos** sobre un `Set` de fechas ordenadas; hoy o ayer la mantienen viva
(sin hoy, `alive: false` = "en riesgo"). `weekStartKey()` saca el **lunes** de la semana de una fecha
(`(getDay() + 6) % 7`) y `weekMinutes` suma los minutos de las sesiones con `weekStart <= date <= hoy`:
al revés que la racha, **acumula minutos y no deduplica días**. El fuego junto al número es decorativo
(`aria-hidden`): visibilidad y tono salen de `data-state` por CSS, `app.js` no lo toca.

## Verificar cambios

`node --check app.js` para sintaxis; el harness de `new Function` de `AGENTS.md` para probar
`calculateStats` (con un `Date` falso que fije el "hoy"). La UI se abre con doble clic (`file://`).
