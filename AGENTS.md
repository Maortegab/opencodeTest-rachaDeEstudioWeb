# AGENTS.md

Aplicación web estática de contador de rachas de estudio. Tres archivos planos en la raíz:
`index.html`, `styles.css`, `app.js`. Sin `package.json`, sin build, sin backend, sin tests.

## Cómo verificar

No hay runner de tests ni linter. Los dos únicos chequeos disponibles:

```powershell
node --check "app.js"                              # sintaxis
node -e "<regex: contar ids de app.js vs index.html>"  # contrato de ids
```

Unit tests de `calculateStats` no tienen harness. El truco usado: leer `app.js`, quitar el
`render();` final con regex y ejecutarlo con `new Function("module","require", src)` inyectando
stubs de `document`, `localStorage` y `crypto`. Si agregas lógica de racha, verifícala así antes
de dar por buena la UI.

Abrir `index.html` con doble clic (`file://`). No hay dev server.

## Restricciones de la arquitectura

- **No introduzcas dependencias, bundler, framework ni módulos ES.** El diseño es deliberadamente
  plano. `type="module"` falla bajo `file://` por CORS, así que un solo `<script src="app.js">`
  al final de `<body>` es lo que funciona hoy.
- `app.js` no tiene `import`/`export`: es script global. Al cargar ejecuta `getElementById` de los
  19 ids en el tope y llama `render()` inmediatamente. **Moverlo a `<head>` sin `defer` rompe la app**;
  si lo mueves, añade `defer`.
- Cada `getElementById` de `app.js` debe existir como `id` en `index.html`. Al agregar campos,
  actualiza ambos archivos.
- Sin secrets ni dependencias de red: `app.js` no usa `fetch` ni URLs externas.
- Iconos decorativos: SVG inline en el HTML (o emoji), siempre `aria-hidden="true"`. Nada de icon
  fonts, CDN ni assets externos; la app debe seguir funcionando con doble clic. Un elemento decorativo
  **no añade id**: el contrato de ids solo crece cuando `app.js` lo necesita.

## Fechas: la parte más fácil de romper

- La clave de día es `YYYY-MM-DD` en **hora local** (`toDateKey`), nunca `toISOString().slice(0,10)`:
  eso convierte a UTC y descuadra el día cerca de medianoche.
- `createdAt` sí es ISO/UTC, y solo se usa para ordenar sesiones dentro del mismo día.
- El día cuenta **una sola vez** para la racha, aunque haya varias sesiones: se calcula sobre un
  `Set` de fechas únicas, no sobre el array de sesiones.
- Reglas que una implementación "obvia" rompe:
  - Si hay sesión **hoy** → cuenta hacia atrás desde hoy.
  - Si no hay hoy pero **sí ayer** → la racha **sigue viva** (vive en `alive: false` y la UI muestra
    "en riesgo"). No devuelvas 0 en ese caso.
  - Hueco de un solo día → la racha se reinicia; la **mejor racha histórica** se calcula aparte y no
    depende de la actual.

## Semana en curso

- `weekStartKey(dateKey)` devuelve el **lunes** de esa semana: retrocede `(getDay() + 6) % 7` sobre una
  fecha en medianoche local. No uses `getDay()` directo (arrancaría en domingo) ni `startOfWeek` de
  una librería.
- `weekMinutes` **suma minutos de todas las sesiones** del rango, no deduplica por día: es lo
  contrario que la racha a propósito. Múltiples sesiones del mismo día deben sumar todas.
- El rango se filtra por comparación de strings `weekStart <= s.date <= today`. Es válido porque
  `YYYY-MM-DD` es de longitud fija y con ceros a la izquierda (lexicográfico = cronológico); no
  hacen falta `Date` ni UTC aquí. El `<= today` deja fuera sesiones con `date` futuro o corrupta.

## Estado y persistencia

- Clave `localStorage`: `studyStreak.sessions`.
- `loadSessions()` filtra entradas malformadas a propósito: datos editados a mano o corrupto no deben
  romper `render()`. Mantén ese filtro.
- `render()` rehace todo el DOM (`replaceChildren`) sin diffing, en cada cambio. Es intencional; no
  introduzcas estado en memoria ni mutaciones incrementales.
- Borrar todo usa `confirm()` bloqueante, coherente con el resto de la UI en español.

## UI y validación

- Tema claro/oscuro por `prefers-color-scheme` mediante variables CSS; no hardcodees colores.
- Responsive por grid CSS: 1 columna en móvil, 2 columnas desde 720px con la tabla a ancho completo.
- Límites de validación en `validate()` deben coincidir con los atributos del HTML
  (`maxlength="80"` en tema, `min="1" max="1440"` en minutos): duplicados, no sustitutos.
- Tras guardar: `form.reset()`, foco al primer campo, mensaje de éxito visible.
- La UI y los mensajes están en español; los identificadores del código, en inglés.
- El repo no lleva comentarios en el código, por convención.
