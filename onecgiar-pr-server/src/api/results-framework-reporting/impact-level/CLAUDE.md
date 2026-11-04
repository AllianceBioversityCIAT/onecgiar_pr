# impact-level (results-framework-reporting)

**Verified:** 2026-10-29 · spec `docs/specs/results/impact-results-reporting/server-foundation/` (IRS-T-3) · P2-3901

## Que es
Seccion "Impact level info" de los resultados de impacto (level 1 / type 9) del portafolio P25:
tipo de estudio, declaracion de contribucion (max 100 palabras) y "ya reportado en PRMS" + enlaces
a resultados previos. Tablas: `impact_study_type` (catalogo sembrado), `results_impact_level` (1:1),
`results_impact_previous_result` (links).

## Rutas
El modulo se monta en `api/modules.routes.ts` en `results-framework-reporting/impact-level`
(el controlador no lleva prefijo). Hoy: E2 `GET .../study-types`, E3 `GET .../get/result/:resultId`,
E4 `PATCH .../save/result/:resultId`, E5 `GET .../previous-results/search`, E6 `GET .../counts`. Solo JWT (paridad IRS-R-12 / IRS-DD-8).

## Reglas
- `utils/count-words.ts` es LA definicion de palabra. Debe coincidir con la SQL
  `validation_impact_level_info_P25` (colapsa `[[:space:]]+` ICU; U+00A0, U+3000 y U+0085 cuentan como
  separador; U+FEFF NO es separador ni se recorta, aunque `\s`/`trim` de JS si lo harian). Cambiar una
  obliga a cambiar la otra.
- E4 valida TODO antes de abrir la transaccion (sin escrituras si se rechaza); dentro hace upsert de
  `results_impact_level` + sync de links (set semantics). `previously_reported=false` desactiva todos los
  links e ignora `previous_result_ids`. Campos no enviados no se tocan.
- Los repositorios extienden `BaseRepository` (replicable). Sus `createQueries` copian filas activas
  en cambio de fase (IRS-R-14); inertes hasta que los resultados de impacto se repliquen (OQ-1).
- `constants/impact-area-tag-column.ts` mapea area -> columna `*_tag_level_id` (IRS-T-4).
- E5/E6 (IRS-T-6) viven en `ImpactLevelSearchService` (valida entradas a mano, sin pipe global; limit 1-50,
  page >= 1) + `repositories/impact-level-search.repository.ts` / `impact-level-counts.repository.ts`
  (solo lectura, query builder sobre `Result`). Orden E5: fase de reporting abierta
  (`VersioningService.$_findActivePhase(REPORTING)`) -> `version.phase_year` desc -> `result_code` asc -> `id`.
  E6 cuenta `tag_level_id = 3` (Principal) por area con `COUNT(DISTINCT ...)`, siempre 5 areas con ceros.
  Orden SQL y p95 NO estan probados por mocks: se prueban en PRTest (IRS-T-9).
