---
name: local-dates
description: Úsala siempre que escribas, modifiques o revises código que trabaje con fechas, dias, semanas o rachas en el diario de estudio.
---

# Fechas locales en el Diario de estudio

Las fechas son la maypr fuente de bugs de este proyecto. Sigue esta guía siempre que toques código con fechas.

## Reglas
- Las fechas se guardan como texto "AAAA-MM-DD" en la zona horaria local del usuario.
- Para obtener el dia de hoy, construye el texto con getFullYear(), getMonth()+1 y getDate() rellenando con ceros.
- Para convertir "AAAA-MM-DD" a fecha usa new date(año, mes-1, dia), nunca new Date("AAAA-MM-DD"): se interpreta en UTC.
- Nunca uses toString() para obtener el dia: devuelve la fecha en UTC.
- Para sumar o restar días, usa setDate(getDate()+/-n), nunca en milisegundos (24 h no siempre es un dia por los cambios de hora).
- Reutiliza las funciones de fecha que ya existen en app.js antes de crear otras nuevas.

## Checklist de revisión
- [ ] ¿Algún toIsoString() o new Date("AAAA-MM-DD")?
- [ ] ¿Algún calculo con 864000000 milisegundos?
- [ ] ¿Qué pasa con una sesión registrada a las 00:30?
- [ ] ¿Qué pasa el dia de cambio de hora (último domingo de marzo y de octubre)?
- [ ] ¿Se ignoran las fechas futuras donde corresponde?

## Al terminar
Indica qué puntos del checklist has comprobado y cómo?