# report-result

**Verified:** 2026-08-21 · branch performance-refactor · eed5bb706

## Qué es
Las piezas puras que comparten las tres superficies que crean un resultado contra un indicador del
ToC: el **payload canónico** y la **validación del handle**. No tienen estado, no inyectan nada y no
hacen HTTP. Existen porque el body estaba triplicado y ya había divergido.

## Contrato
- `buildCreateResultPayload(options)` → el body de `POST_createResult`. Recibe **un objeto de
  opciones**, nunca argumentos posicionales: bilaterales (P2-3352 / P2-3341) añadirá claves.
- `OTHER_CENTERS_CODE` (`'__OTHER_CENTERS__'`) y `OTHER_SP_ID` (`-999`): los centinelas que abren el
  segundo desplegable. **Jamás viajan en el payload** — se filtran dentro del util.
- `validateKpHandle(handle)` → `{ status, message }`. `KP_HANDLE_REGEX` +
  `KP_HANDLE_EMPTY_MESSAGE` / `KP_HANDLE_UNSUPPORTED_MESSAGE`.

## Dónde se usa
- `../../pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts` — el aside.
- Pendiente de migrar (siguen con su copia local, a propósito, hasta que el aside se verifique en
  producción): `aow-hlo-create-modal.component.ts:332` y `guided-creation.component.ts:401`.

## La matriz que este código protege
Una sola bifurcación en todo el formulario: **Knowledge product vs todo lo demás**. Verificado sobre
1.684 indicadores vivos de prtest.

| `result_type_id` | Categoría | Nº | Qué cambia |
|---|---|---|---|
| 6 | Knowledge product | 688 | handle + Sync, título bloqueado y traído del repositorio |
| 7 | Innovation development | 385 | nada — solo el título |
| 5 | Capacity sharing | 182 | igual que 7 |
| 2 | Innovation use | 51 | igual que 7 |
| 1 | Policy change | 28 | igual que 7 |
| `null` | sin categoría | 350 | aparece el desplegable obligatorio |
| 4 / 8 | Other outcome / Other output | — | **solo** alcanzables por ese desplegable |

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`4 Other outcome` y `8 Other output` existen y son reportables.** `removeResultTypes`
  (`result-level.service.ts:143-151`) solo quita 10 y 11. Todo análisis previo de este flujo los
  omitió. Si añades una rama por categoría, cúbrelas.
- ⚠️ **`knowledge_product` y `handler` se anulan si la categoría no es 6.** Sin eso, un usuario que
  sincroniza un handle y luego cambia de categoría envía metadata de KP bajo otro tipo; el servidor
  ramifica por `result_type_id === 6` y **la descarta en silencio**.
- ⚠️ **`indicators` pasa por `stripReportingDisplayKeys`.** La tabla de Reporting cuelga `__hloNode`
  de cada fila — el grupo HLO **entero**, con todos los indicadores hermanos. No hay `ValidationPipe`
  global en el server, así que no revienta: se acepta y se infla.
- `result_level_id` **nunca** lo elige el usuario: sale del indicador, luego del nodo.
- `from_toc: true` para lo que viene del ToC, `false` para lo del segundo desplegable. El backend lo
  usa para clasificar contribuyentes (P2-3114).
- `toc_progressive_narrative` se envía siempre `''`, como hace el modal. No hay campo que lo llene.

## Pendiente / Coming soon
- Migrar el modal y `guided-creation` a `buildCreateResultPayload()` — solo después de verificar el
  aside en navegador. Hasta entonces conviven 3 copias, no 4: el aside ya no tiene la suya.
