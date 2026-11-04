// @akili-spec quality-assurance/qa-results-feed
// P-13 / QRF-DD-8: the fixed registry of logical lookup sources. The catalog names a source (`toc.integration_information.*`,
// `clarisa.institutions`, `prms.*`); this is the ONE place that knows where it lives. Physical names never leave the
// reader and never reach an error (QRF-R-9). The ToC database name is read from the environment when a source is
// resolved, never at import, never stored and never logged.
import { env as processEnv } from 'node:process';

interface SourceEntry {
  table: string;
  /** Single-column primary key: the stable order of the rows a lookup reads. */
  primaryKey: string;
  /** `toc`: the table lives in the ToC database named by configuration. */
  database?: 'toc';
}

const TOC = 'toc.integration_information.';

export const LOOKUP_SOURCES: Readonly<Record<string, SourceEntry>> = {
  [`${TOC}toc_results`]: {
    table: 'toc_results',
    primaryKey: 'id',
    database: 'toc',
  },
  [`${TOC}toc_results_indicators`]: {
    table: 'toc_results_indicators',
    primaryKey: 'id',
    database: 'toc',
  },
  [`${TOC}toc_result_indicator_target`]: {
    table: 'toc_result_indicator_target',
    primaryKey: 'toc_indicator_target_id',
    database: 'toc',
  },
  'clarisa.institutions': { table: 'clarisa_institutions', primaryKey: 'id' },
  'prms.fair_fields': { table: 'fair_fields', primaryKey: 'fair_field_id' },
  'prms.investment_discontinued_option': {
    table: 'investment_discontinued_option',
    primaryKey: 'investment_discontinued_option_id',
  },
  'prms.result_questions': {
    table: 'result_questions',
    primaryKey: 'result_question_id',
  },
};

export interface ResolvedLookupSource {
  /** Set for the ToC sources only. */
  schema?: string;
  table: string;
  primaryKey: string;
}

/**
 * Where `source` is read from, or `undefined` when the source is not in the registry or its database is not
 * configured. The caller reports that against the field's catalog key.
 */
export function resolveLookupSource(
  source: string,
  env: Record<string, string | undefined> = processEnv,
): ResolvedLookupSource | undefined {
  if (!Object.prototype.hasOwnProperty.call(LOOKUP_SOURCES, source))
    return undefined;
  const { table, primaryKey, database } = LOOKUP_SOURCES[source];
  if (database !== 'toc') return { table, primaryKey };
  const schema = env.DB_TOC;
  return schema ? { schema, table, primaryKey } : undefined;
}
