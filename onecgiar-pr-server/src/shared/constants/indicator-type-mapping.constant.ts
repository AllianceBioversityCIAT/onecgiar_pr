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
