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

En `/admin/import`, un administrador elige **Añadir juego nuevo**, una categoría y/o una mecánica, y pulsa **Buscar y preparar ficha**. El agente consulta el catálogo, descarta de la evidencia los títulos ya existentes, busca candidatos variados con Tavily dentro de las tiendas compatibles y elige uno con Amazon Nova Micro mediante la integración oficial `@langchain/aws`. El backend vuelve a filtrar cualquier dominio no soportado y —no Nova— decide si existe un duplicado en `Game` o `GameCandidate`.

Si no existe, el importador maestro crea un `GameCandidate` trazable y el workflow intenta convertirlo inmediatamente en un `Game` con estado `review`. Después ejecuta el autofill web, el completado editorial, vuelve a aplicar la categoría y la mecánica pedidas y valida los campos necesarios para publicar. Los enriquecimientos son tolerantes a fallos: si falla uno, la ficha de revisión se conserva; si falla la conversión, se conserva el Candidate como fallback. El pipeline nunca establece el estado `published`: el clic final de **Publicar** sigue siendo exclusivamente humano.

Es un agente pequeño porque el modelo interpreta los filtros taxonómicos y elige qué candidato está respaldado por los resultados. Sus tools son `listExistingGames`, `searchGameCandidates` y `submitCandidateSelection`; todas son de lectura o entrega de una decisión estructurada. La detección final de duplicados y la importación quedan fuera del agente. El backend conserva las validaciones, los límites y la escritura final.

Límites: 4 pasos de modelo y 2 búsquedas de selección por intento, con un máximo de 2 intentos del workflow únicamente antes de comenzar cualquier escritura. Nova dispone de 2 retries del cliente y cada búsqueda Tavily de selección admite un segundo intento tras 1,5 segundos. El presupuesto total es de 120 segundos y la preparación inicial de la ficha mantiene un límite separado de 30 segundos. Si dos búsquedas no aportan evidencia, el backend termina directamente sin gastar otra llamada a Nova. No hay ejecución en Server Components, carga de página, efectos, build, cron ni importación de módulos.

El modo seguro está desactivado por defecto:

```env
CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED=false
```

Si el valor no es exactamente `true`, Bedrock y Tavily se bloquean antes de crear sus clientes y el endpoint devuelve `external_calls_disabled`. Para probar localmente sin coste:

```bash
CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED=false npm run check
CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED=false MASTER_IMPORT_TAVILY_MODE=off MASTER_IMPORT_BEDROCK_MODE=off MASTER_IMPORT_VIDEO_SEARCH_MODE=off ./node_modules/.bin/tsx --test test/catalogueAgent.test.ts
```

Las credenciales de AWS y Tavily se configuran únicamente en el entorno local/hosting; nunca en `.env.example` ni en el repositorio.
