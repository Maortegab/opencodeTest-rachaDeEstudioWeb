# Spec 001 — Mapa de calor por minutos

## Contexto y objetivo

El panel "Racha actual" muestra hoy la cinta (`id="ribbon"`): 35 celdas seguidas alineadas a
hoy y 3 niveles fijos (`ribbonLevel`: 1-29 / 30-89 / ≥90 min). Las filas no coinciden con
semanas, no hay leyenda y el significado del color no se explica.

Objetivo: convertirla en un mapa de calor tipo GitHub —columnas = semanas, filas = lunes a
domingo— donde la intensidad de cada día refleje los minutos estudiados con 4 umbrales fijos,
con leyenda visible y resaltado de fila/columna al pasar el puntero.

La ventana es siempre el lunes de hace 4 semanas hasta la semana en curso, pintando solo los
días ≤ hoy (29-35 celdas según el día). El orden dentro del panel es: mapa → leyenda → pie
"Esta semana: X". Se mantiene la ubicación en el panel de racha, el `id="ribbon"` y el
`aria-label` resumen. Cumple docs/constitution.md: stack plano, cero dependencias, lógica pura
separada de la UI, datos solo en localStorage, español en textos e inglés en identificadores.

## Usuarios

- **Estudiante (principal)**: registra sesiones sin cuenta; quiere ver de un vistazo qué días estudió más.
- **Mantenedor principiante**: edita los 3 archivos; necesita umbrales y pintado fáciles de localizar.
- **Usuaria con lector de pantalla o móvil**: no distingue colores ni usa ratón; depende del
  `aria-label`, la leyenda y los tooltips.

## Historias de usuario

1. Como estudiante, quiero ver las últimas 5 semanas con el color de cada día según 4 umbrales
   fijos de minutos, para detectar los días intensos y los huecos de un vistazo.
2. Como estudiante, quiero una leyenda bajo el mapa, para saber qué minutos representa cada color.
3. Como estudiante, quiero que al pasar el ratón o tocar una celda se resalten su día de la
   semana y su semana, para leer la fila sin contar celdas.
4. Como mantenedor principiante, quiero que el cálculo del nivel viva en una función pura y el
   color en CSS, para cambiar umbrales sin tocar el render.
5. Como usuaria con lector de pantalla, quiero un resumen textual del mapa, para no depender del color.

## Requisitos funcionales

### RF-1 — Geometría semanal

**Requisito (Ubicuo):** El sistema debe mostrar el mapa como 7 filas (lunes…domingo) × 5 columnas
(semanas), con la ventana desde el lunes de hace 4 semanas hasta la semana en curso, pintando
solo los días ≤ hoy; el mapa se muestra siempre, también con 0 sesiones.

- (Estado) Dado que hoy es miércoles, cuando se renderiza, entonces la última columna contiene
  lunes, martes y miércoles (31 celdas en total); las celdas futuras jueves-domingo no están en
  el DOM.
- (Comportamiento no deseado) Si hoy es lunes, entonces el mapa tiene 29 celdas y la última
  columna solo contiene la de lunes.
- (Comportamiento no deseado) Si `loadSessions()` devuelve `[]`, entonces se pintan todas las
  celdas de la ventana como "sin registro" y la consola queda limpia.
- (Ubicuo) El mapa ocupa el lugar exacto de la cinta actual: `id="ribbon"` dentro de
  `streak-panel`, seguido de la leyenda y después del pie "Esta semana: X"; las etiquetas de día
  (Lun…Dom) quedan a la izquierda del mapa y fuera del `role="img"`.
- Verificación: el contrato de ids `app.js` ↔ `index.html` sigue siendo exacto.

### RF-2 — Niveles de intensidad

**Requisito (Evento):** Cuando un día tenga al menos una sesión, el sistema debe asignarle nivel
1 (1-29 min), 2 (30-59), 3 (60-119) o 4 (≥120) según los minutos totales de ese día.

- (Evento) Cuando un día acumula 25 + 35 min en dos sesiones, entonces la celda es nivel 3 y el
  tooltip muestra "1 h".
- (Evento) Cuando un día acumula 2880 min, entonces la celda es nivel 4 y el tooltip muestra "48 h".
- (Comportamiento no deseado) Si un día tiene 29 min → nivel 1; 30 → 2; 119 → 3; 120 → 4
  (fronteras exactas, sin solapamientos).
- (Comportamiento no deseado) Si un día no tiene sesiones, entonces no recibe `data-level` y usa
  el color "sin registro".
- (Comportamiento no deseado) Si una sesión tiene `date` futura o malformada, entonces no aporta
  minutos ni nivel (filtro de `loadSessions`).
- (Ubicuo) El cálculo de niveles y la suma por día viven dentro de `calculateStats`
  (función pura, sin `document` ni `localStorage`); `ribbonLevel` pasa a `heatLevel` con los 4
  umbrales y `render*()` solo pinta.

### RF-3 — Leyenda visible

**Requisito (Ubicuo):** El sistema debe mostrar entre el mapa y el pie una leyenda de 5 muestras
con el texto: "sin registro", "<30 min", "30-59 min", "60-119 min", "120+ min".

- (Ubicuo) Cada muestra y su celda consumen la misma variable CSS (`--heat-empty`,
  `--heat-1`…`--heat-4`), por lo que cambian juntas con `prefers-color-scheme` sin colores
  hardcodeados.
- (Ubicuo) La leyenda es texto visible, sin `aria-hidden` y fuera del `role="img"`; no lleva
  `id` porque `app.js` no la toca.
- (Comportamiento no deseado) Si el contraste de una celda fuera insuficiente para el usuario,
  entonces la leyenda y el `title` son la información redundante admitida (el contraste por celda
  está fuera de alcance).

### RF-4 — Tooltip por celda

**Requisito (Evento):** Cuando una celda tenga registro y el usuario pase el puntero sobre ella,
el sistema debe mostrar en `title` la fecha de `formatDate` seguida de " · " y los minutos en
formato `formatMinutes`.

- (Evento) Cuando un día tiene 90 min, entonces su `title` es "12 oct 2026 · 1 h 30 min".
- (Comportamiento no deseado) Si la celda no tiene registro, entonces su `title` es
  "12 oct 2026 · sin registro" (fecha + " · sin registro", nunca minutos).
- (Comportamiento no deseado) Si la celda sería futura, entonces no existe en el DOM y no tiene
  `title`.
- (Ubicuo) La fecha sale de `formatDate` (hora local, nunca `toISOString`).

### RF-5 — Resaltado de fila y columna

**Requisito (Evento):** Cuando el puntero entre en una celda (o la celda reciba un toque), el
sistema debe marcar con un anillo interior (`box-shadow` inset con `--ink-strong`) todas las
celdas existentes de su fila y de su columna a la vez.

- (Evento) Cuando el puntero está en la semana 3, día miércoles, entonces quedan anilladas las
  celdas existentes de esa columna y las de la fila miércoles, incluidas las vacías pasadas.
- (Comportamiento no deseado) Si el puntero sale del mapa, entonces el resaltado desaparece sin
  dejar estado residual.
- (Comportamiento no deseado) Si la celda resaltada es la de hoy, entonces su color de nivel y su
  contorno (hoy o ámbar en riesgo) siguen visibles: el anillo usa `box-shadow` y no sustituye ni
  el `background` ni el `outline`.
- (Comportamiento no deseado) Si la celda de hoy no tiene nivel (racha en riesgo), entonces solo
  recibe el anillo; su color de "sin registro" y su contorno no cambian.
- (Evento) Cuando el usuario toca una celda en táctil, entonces el resaltado queda activo hasta
  que toque otra celda o un punto fuera del mapa.
- (Evento) Cuando se guarda o borra una sesión mientras el puntero está sobre el mapa, entonces
  el resaltado se limpia al reconstruir el DOM con `replaceChildren`.
- (Estado) Mientras el resaltado está activo, entonces no cambian la tabla, las estadísticas ni
  el `localStorage` (no hay filtrado).

### RF-6 — Resumen accesible

**Requisito (Evento):** Cuando se actualice el mapa, el sistema debe refrescar el `aria-label`
del contenedor con un resumen en español: días con sesión y minutos de la ventana de 5 semanas,
más el mensaje de racha.

- (Comportamiento no deseado) Si no hay sesiones, entonces el `aria-label` describe el mapa
  vacío, sin "undefined" ni "NaN".
- (Comportamiento no deseado) Si solo hay sesiones anteriores a la ventana, entonces el
  `aria-label` indica "sin actividad en las últimas 5 semanas" y añade el mensaje de racha.
- (Ubicuo) Las etiquetas de día (Lun…Dom) y la leyenda quedan fuera del `role="img"`, como texto
  visible legible por lector de pantalla.

## Requisitos no funcionales

- **RNF-1** (const. 3): `calculateStats` devuelve además `cells` —35 descriptores
  `{dateKey, minutes, level, future, isToday}`— generados con `shiftDays`/`weekStartKey`; es
  pura (sin DOM, storage ni fechas actuales) y `render*()` solo pinta.
- **RNF-2** (const. 4): cero dependencias; sin librerías, CDNs ni módulos ES; se abre con doble clic.
- **RNF-3**: colores solo con las variables `--heat-*` y `color-mix` ya existentes; nada hardcodeado.
- **RNF-4**: responsive — celdas ≥ 20 px a 320 px de ancho, sin scroll horizontal (también con
  zoom de texto del 200%) y ancho completo desde 720 px.
- **RNF-5** (const. 6): textos en español, identificadores en inglés, sin comentarios en el código.
- **RNF-6** (const. 2): al implementar, `AGENTS.md`, `MEMORY.md` y esta spec se actualizan en el
  mismo commit (geometría, umbrales, variables de color, leyenda).
- **RNF-7**: verificación con `node --check app.js`, tests de lógica y contrato con `node --test`
  (descubre `tests/*.test.js`; en Windows no valga `node --test tests/`) y prueba manual en Chrome
  DevTools (escritorio, móvil y consola limpia).
- **RNF-8**: el resaltado se resuelve con CSS puro (`:has`), sin listeners por celda ni estado en
  memoria (obligatorio, no preferente).
- **RNF-9**: cualquier transición dura ≤ 200 ms y se anula con `prefers-reduced-motion`.

## Casos límite

1. Día con 1 min → nivel 1; con 1440 min → nivel 4.
2. Varias sesiones el mismo día → una sola celda con la suma; si la suma supera 1440 min, el
   tooltip muestra las horas (`formatMinutes`) y el nivel es 4.
3. Hoy es lunes → 29 celdas y la última columna solo tiene la de lunes.
4. Ventana que cruza el cambio de hora (últimos domingos de marzo y octubre) → solo
   `weekStartKey`/`shiftDays` con `setDate`, nunca milisegundos ni `toISOString`.
5. Sesión guardada a las 00:30 → cuenta en su día local (`toDateKey`), no en UTC.
6. `date` futura o JSON corrupto en storage → filtrada, el mapa no pinta nivel.
7. Racha "en riesgo" (sin sesión hoy) → celda de hoy sin nivel y con contorno ámbar
   (`.streak[data-state="risk"]`); al resaltar solo recibe el anillo.
8. "Borrar todo" → todas las celdas de la ventana vacías, leyenda intacta, consola limpia.
9. Táctil → el toque activa el resaltado pegajoso sin impedir el scroll de la página.
10. Usuario nuevo sin sesiones previas → mapa totalmente vacío.
11. Ventana que cruza mes o año (p. ej. 28 sep → 26 oct, o diciembre → enero) → las fechas del
    tooltip salen correctas con `formatDate`.
12. Sesión del lunes a las 00:30 → cae en la columna de su semana según `weekStartKey`.
13. Solo sesiones anteriores a la ventana → mapa vacío, estadísticas con datos y `aria-label`
    "sin actividad en las últimas 5 semanas".
14. Guardar o borrar con el puntero sobre el mapa → el resaltado se limpia al reconstruir el DOM.

## Fuera de alcance

- Clic en una celda para filtrar la tabla de sesiones.
- Eje de fechas por semanas/meses, cambiar la ventana o paginar.
- Estadísticas nuevas (promedio diario, minutos por día de la semana).
- Configurar umbrales desde la UI o persistirlos.
- Animaciones más allá de una transición ≤ 200 ms.
- Contraste o marca no cromática por celda más allá de la leyenda y el `title`.
- Foco o navegación con teclado sobre las celdas.
- Exportar/imprimir el mapa; servidor, sincronización o cuentas.
