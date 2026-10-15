---
description: SDD - Recorre las tareas creadas y verificalas
agent: build
---
Recorre specs/$1/spec.md requisito por requisito.Para cada uno indica qué test lo cubre y el resultado de ejecutarlo. Los RF de interfaz que no se pueden testear con node --test, verifícalos con Chrome DevTools (incluida la vista móvil). Si algún RF no está cubierto o falla, dilo claramente.
Después comprueba los criterios de finalización y dame un veredicto: ¿la spec está cumplida?