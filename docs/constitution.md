# Constitución del Diario de Estudio

1. **Stack plano**: solo `index.html`, `styles.css`, `app.js`; se abre con doble clic, sin build. Los tests viven en `tests/` con `node --test` y no forman parte del stack.
2. **Spec y código juntos**: cambio de comportamiento = cambio en `AGENTS.md`/`MEMORY.md` y en la spec de `specs/NNN-*/` en el mismo commit.
3. **Lógica separada de la interfaz**: `calculateStats` es pura (sin DOM ni storage); `render()` solo dibuja.
4. **Cero dependencias**: nada de `npm install`, CDN, frameworks ni módulos ES. Legible para un principiante.
5. **Datos solo locales**: `localStorage` del navegador, sin red; "Borrar todo" vacía todo.
6. **Español en textos, inglés en identificadores**: mensajes de la UI en español, nombres en inglés.
