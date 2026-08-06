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

## Agente de catálogo del importador

En `/admin/import`, un administrador elige **Añadir juego nuevo**, una categoría y/o una mecánica, y pulsa **Buscar e importar borrador**. El agente consulta el catálogo, busca candidatos con Tavily dentro de las tiendas compatibles y elige uno con Amazon Nova mediante la integración oficial `@langchain/aws`. El backend vuelve a filtrar cualquier dominio no soportado y —no Nova— decide si existe un duplicado en `Game` o `GameCandidate`. Si no existe, lanza automáticamente la resolución del importador maestro y persiste únicamente un `GameCandidate` + `aiDraft` para revisión. Si una tienda no permite enriquecer la ficha completa, conserva un borrador básico trazable para revisión. Nunca crea ni publica un `Game`.

Es un agente pequeño porque el modelo interpreta los filtros taxonómicos y elige qué candidato está respaldado por los resultados. Sus tools son `listExistingGames`, `searchGameCandidates` y `submitCandidateSelection`; todas son de lectura o entrega de una decisión estructurada. La detección final de duplicados y la importación quedan fuera del agente. El backend conserva las validaciones, los límites y la escritura final.

Límites: 4 llamadas al modelo, 2 búsquedas Tavily y 45 segundos para la ejecución agentic; la importación directa de la ficha dispone después de un presupuesto separado de 30 segundos. La salida se valida con Zod, informa del número de llamadas realizadas y todo Candidate queda en `needs_review` para revisión humana. La categoría y la mecánica solicitadas se guardan en el metadata del Candidate. No hay ejecución en Server Components, carga de página, efectos, build, cron ni importación de módulos.

El modo seguro está desactivado por defecto:

```env
CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED=false
```

Si el valor no es exactamente `true`, Bedrock y Tavily se bloquean antes de crear sus clientes y el endpoint devuelve `external_calls_disabled`. Para probar localmente sin coste:

```bash
CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED=false npm run check
CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED=false ./node_modules/.bin/tsx --test test/catalogueAgent.test.ts
```

Las credenciales de AWS y Tavily se configuran únicamente en el entorno local/hosting; nunca en `.env.example` ni en el repositorio.
