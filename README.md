# MeepleTavern difficulty backfill

Ficheros incluidos:
- scripts/backfill-difficulty.ts
- lib/import/difficulty.ts
- package.json

Uso:
1. Copia los ficheros encima del proyecto.
2. Ejecuta primero en modo simulación:
   npm run backfill:difficulty
3. Si la tabla de cambios es correcta, aplica:
   npm run backfill:difficulty -- --write

El script no llama a IA ni APIs externas. Solo recalcula difficulty/complexity con datos ya existentes.
Por seguridad no rebaja dificultades manualmente más altas. Para permitir rebajas:
   npm run backfill:difficulty -- --write --allow-downgrade
