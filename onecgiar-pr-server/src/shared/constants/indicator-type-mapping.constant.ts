import { ResultTypeEnum } from './result-type.enum';

export const RESULT_TYPE_TO_INDICATOR_PATTERN: Record<number, string[]> = {
  [ResultTypeEnum.INNOVATION_DEVELOPMENT]: ['%Number of innovations%'],
  [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]: [
    '%Number of people trained%',
  ],
  [ResultTypeEnum.KNOWLEDGE_PRODUCT]: ['%Number of knowledge products%'],
  [ResultTypeEnum.POLICY_CHANGE]: ['%Number of Policy%'],
  [ResultTypeEnum.INNOVATION_USE]: ['%Innovation Use%'],
  [ResultTypeEnum.INNOVATION_USE_IPSR]: ['%Innovation Use%'],
} as const;

/**
 * Patrones de indicadores de todos los tipos excepto el dado.
 * Sirve para incluir ToC que no hacen match con otros types (ToC "neutros").
 */
export function getOtherTypesIndicatorPatterns(
  currentResultTypeId: number,
): string[] {
  const entries = Object.entries(RESULT_TYPE_TO_INDICATOR_PATTERN) as [
    string,
    readonly string[],
  ][];
  const other = entries
    .filter(([key]) => Number(key) !== currentResultTypeId)
    .flatMap(([, patterns]) => [...patterns]);
  return [...new Set(other)];
}

/**
 * P2-2932 — the same mapping as a SQL `CASE`, so a query can label a ToC indicator with the result
 * type it belongs to.
 *
 * Built from `RESULT_TYPE_TO_INDICATOR_PATTERN` rather than written out, because the literal CASE
 * was already copy-pasted twice (`aow-bilateral.repository.ts` has it inline, twice in the same
 * query). A third copy is the one that drifts: the day someone adds a type here and not there, the
 * two disagree in silence.
 *
 * IPSR Innovation Use (10) shares Innovation Use's pattern and is skipped, so a matching indicator
 * resolves to the plain type (2) rather than to whichever entry happened to be iterated last.
 *
 * @param column the aliased column holding the ToC indicator's `type_value`
 */
export function indicatorResultTypeCaseSql(column: string): string {
  const branches = Object.entries(RESULT_TYPE_TO_INDICATOR_PATTERN)
    .filter(([typeId]) => Number(typeId) !== ResultTypeEnum.INNOVATION_USE_IPSR)
    .flatMap(([typeId, patterns]) =>
      patterns.map(
        (pattern) => `WHEN ${column} LIKE '${pattern}' THEN ${typeId}`,
      ),
    );

  return `CASE ${branches.join(' ')} ELSE NULL END`;
}
