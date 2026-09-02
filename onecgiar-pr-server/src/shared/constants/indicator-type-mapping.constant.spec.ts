import {
  RESULT_TYPE_TO_INDICATOR_PATTERN,
  getOtherTypesIndicatorPatterns,
  indicatorResultTypeCaseSql,
} from './indicator-type-mapping.constant';
import { ResultTypeEnum } from './result-type.enum';

describe('indicatorResultTypeCaseSql (P2-2932)', () => {
  const sql = indicatorResultTypeCaseSql('tri.type_value');

  it('uses the column it is given, so a query can alias the table freely', () => {
    expect(indicatorResultTypeCaseSql('x.type_value')).toContain(
      'x.type_value LIKE',
    );
  });

  it('emits a branch for every pattern in the shared map', () => {
    const patterns = Object.entries(RESULT_TYPE_TO_INDICATOR_PATTERN)
      .filter(([id]) => Number(id) !== ResultTypeEnum.INNOVATION_USE_IPSR)
      .flatMap(([, list]) => list);

    for (const pattern of patterns) {
      expect(sql).toContain(`LIKE '${pattern}'`);
    }
  });

  /**
   * IPSR Innovation Use (10) shares Innovation Use's pattern. Emitting both would make the result
   * depend on iteration order — a matching indicator could resolve to 2 or to 10 depending on
   * which branch came last.
   */
  it('emits Innovation Use once, not twice under two type ids', () => {
    const occurrences = sql.split("LIKE '%Innovation Use%'").length - 1;

    expect(occurrences).toBe(1);
    expect(sql).toContain(`THEN ${ResultTypeEnum.INNOVATION_USE}`);
    expect(sql).not.toContain(`THEN ${ResultTypeEnum.INNOVATION_USE_IPSR}`);
  });

  it('falls back to NULL rather than guessing a type', () => {
    expect(sql.trim().endsWith('ELSE NULL END')).toBe(true);
  });

  // The point of building it from the map: adding a type there must reach the SQL for free.
  it('stays in step with the map it is generated from', () => {
    for (const typeId of Object.keys(RESULT_TYPE_TO_INDICATOR_PATTERN)) {
      if (Number(typeId) === ResultTypeEnum.INNOVATION_USE_IPSR) continue;
      expect(sql).toContain(`THEN ${typeId}`);
    }
  });

  it('leaves the existing helper untouched', () => {
    expect(
      getOtherTypesIndicatorPatterns(ResultTypeEnum.KNOWLEDGE_PRODUCT),
    ).not.toContain('%Number of knowledge products%');
  });
});
