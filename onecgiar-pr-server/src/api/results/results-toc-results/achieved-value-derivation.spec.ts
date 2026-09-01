import {
  compareResultTotal,
  compareWithReportedData,
  deriveAchievedValue,
  deriveCapacityDevelopmentTotal,
  deriveInnovationUseTotal,
  shouldShowComparison,
} from './achieved-value-derivation';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('P2-2932 — deriving the contribution from the result’s own data', () => {
  describe('Capacity Development — the total the ticket names does not exist as a column', () => {
    it('sums the four head counts', () => {
      expect(
        deriveCapacityDevelopmentTotal({
          female_using: 60,
          male_using: 50,
          non_binary_using: 5,
          has_unkown_using: 5,
        }),
      ).toBe(120);
    });

    // Those are people who were trained, only without a recorded gender. Dropping them would make
    // the derived value disagree with what the four boxes visibly add up to on screen.
    it('includes the unspecified-gender count', () => {
      expect(deriveCapacityDevelopmentTotal({ has_unkown_using: 7 })).toBe(7);
    });

    it('treats null, undefined and empty as zero — the four inputs are optional', () => {
      expect(
        deriveCapacityDevelopmentTotal({
          female_using: 10,
          male_using: null,
          non_binary_using: undefined,
        }),
      ).toBe(10);
      expect(deriveCapacityDevelopmentTotal(null)).toBe(0);
      expect(deriveCapacityDevelopmentTotal(undefined)).toBe(0);
      expect(deriveCapacityDevelopmentTotal({})).toBe(0);
    });

    // The columns are bigint, which TypeORM hands back as strings.
    it('reads the bigint columns as numbers, not as concatenated strings', () => {
      expect(
        deriveCapacityDevelopmentTotal({
          female_using: '60',
          male_using: '50',
        }),
      ).toBe(110);
    });

    it('ignores negative and non-numeric values rather than subtracting them', () => {
      expect(
        deriveCapacityDevelopmentTotal({ female_using: -5, male_using: 'abc' }),
      ).toBe(0);
    });
  });

  describe('one reported result is one product', () => {
    it('derives 1 for a Knowledge Product', () => {
      expect(
        deriveAchievedValue({ resultTypeId: ResultTypeEnum.KNOWLEDGE_PRODUCT }),
      ).toEqual({ derivable: true, value: 1 });
    });

    it('derives 1 for an Innovation Development', () => {
      expect(
        deriveAchievedValue({
          resultTypeId: ResultTypeEnum.INNOVATION_DEVELOPMENT,
        }),
      ).toEqual({ derivable: true, value: 1 });
    });

    it('derives the head-count total for Capacity Sharing', () => {
      expect(
        deriveAchievedValue({
          resultTypeId: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          capacityDevelopment: { female_using: 60, male_using: 60 },
        }),
      ).toEqual({ derivable: true, value: 120 });
    });
  });

  /**
   * The point of the whole module. Both rules name a selection the form does not capture, so any
   * number produced for them would be invented — and this figure feeds live progress reporting.
   */
  describe('the type whose rule still names a field that does not exist', () => {
    // Policy Change is the last one left. Its rule needs a three-way contribution-type selector the
    // form does not have, and an "actors influenced" field that does not exist at all.
    it('refuses to derive Policy Change — no contribution-type selector, no actors-influenced field', () => {
      expect(
        deriveAchievedValue({ resultTypeId: ResultTypeEnum.POLICY_CHANGE }),
      ).toEqual({ derivable: false, reason: 'NO_CONTRIBUTION_TYPE_SELECTOR' });
    });

    // Innovation Use used to sit here too. It became derivable once the field question was settled
    // from the code: `how_many` is the row total either way, so there is no toggle to wait for.
    it('derives Innovation Use as zero when it has no actor rows, rather than refusing', () => {
      expect(
        deriveAchievedValue({ resultTypeId: ResultTypeEnum.INNOVATION_USE }),
      ).toEqual({ derivable: true, value: 0 });
    });

    it('refuses to derive a type the ticket gives no rule for', () => {
      expect(
        deriveAchievedValue({ resultTypeId: ResultTypeEnum.OTHER_OUTCOME }),
      ).toEqual({ derivable: false, reason: 'NO_RULE_FOR_TYPE' });
      expect(deriveAchievedValue({ resultTypeId: 999 }).derivable).toBe(false);
    });
  });

  /**
   * The whole ticket, per the PO: read what the user typed, look for something equivalent in the
   * type-specific section, show the comparison — and when there is nothing to compare, stay quiet.
   */
  describe('comparing what the user typed against their own data', () => {
    const capDev = {
      resultTypeId: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      capacityDevelopment: { female_using: 60, male_using: 60 },
    };
    const kp = { resultTypeId: ResultTypeEnum.KNOWLEDGE_PRODUCT };

    it('reports a match, carrying both figures', () => {
      expect(compareWithReportedData(capDev, 120)).toEqual({
        status: 'MATCH',
        expected: 120,
        reported: 120,
      });
      expect(compareWithReportedData(capDev, '120').status).toBe('MATCH');
    });

    it('reports a difference when the contribution does not match the head count', () => {
      expect(compareWithReportedData(capDev, 100)).toEqual({
        status: 'DIFFERS',
        expected: 120,
        reported: 100,
      });
    });

    it('reports a difference for a Knowledge Product contribution other than 1 or 0', () => {
      expect(compareWithReportedData(kp, 5).status).toBe('DIFFERS');
      expect(compareWithReportedData(kp, 1).status).toBe('MATCH');
    });

    /**
     * The case a boolean gets wrong. The tooltip printed under the field tells the user to enter 0
     * for a KP that does not count independently. Flagging it would fire a warning at someone for
     * following the instruction.
     */
    it('accepts the documented 0 on a Knowledge Product instead of flagging it', () => {
      expect(compareWithReportedData(kp, 0)).toEqual({
        status: 'ALLOWED_EXCEPTION',
        expected: 1,
        reported: 0,
      });
      expect(shouldShowComparison(compareWithReportedData(kp, 0))).toBe(false);
    });

    it('accepts the same 0 on an Innovation Development — the ticket gives it the KP logic', () => {
      expect(
        compareWithReportedData(
          { resultTypeId: ResultTypeEnum.INNOVATION_DEVELOPMENT },
          0,
        ).status,
      ).toBe('ALLOWED_EXCEPTION');
    });

    // The 0 is only privileged where the product documents it. A Capacity Sharing result reporting
    // 0 against 120 trained people is a genuine disagreement.
    it('does not extend that exception to other types', () => {
      expect(compareWithReportedData(capDev, 0).status).toBe('DIFFERS');
    });

    it('stays quiet when the type has nothing to compare against', () => {
      expect(
        compareWithReportedData(
          { resultTypeId: ResultTypeEnum.POLICY_CHANGE },
          999,
        ),
      ).toEqual({
        status: 'NOTHING_TO_COMPARE',
        expected: null,
        reported: null,
      });
      // Innovation Use is derivable now; with no actor rows it expects 0, so 999 is a real
      // disagreement rather than silence.
      expect(
        compareWithReportedData(
          { resultTypeId: ResultTypeEnum.INNOVATION_USE },
          999,
        ).status,
      ).toBe('DIFFERS');
    });

    it('stays quiet on an empty box, but still carries what was expected', () => {
      expect(compareWithReportedData(capDev, null)).toEqual({
        status: 'NOTHING_TO_COMPARE',
        expected: 120,
        reported: null,
      });
      expect(compareWithReportedData(capDev, '').status).toBe(
        'NOTHING_TO_COMPARE',
      );
      expect(compareWithReportedData(capDev, 'abc').status).toBe(
        'NOTHING_TO_COMPARE',
      );
    });

    it('only asks the caller to show something on a real difference', () => {
      expect(shouldShowComparison(compareWithReportedData(capDev, 100))).toBe(
        true,
      );
      expect(shouldShowComparison(compareWithReportedData(capDev, 120))).toBe(
        false,
      );
      expect(shouldShowComparison(compareWithReportedData(capDev, null))).toBe(
        false,
      );
    });
  });
});

describe('P2-2932 — Innovation Use, and comparing a result as a whole', () => {
  describe('the actors list', () => {
    it('sums how_many across every row', () => {
      expect(
        deriveInnovationUseTotal([{ how_many: 203100 }, { how_many: 1900 }]),
      ).toBe(205000);
    });

    /**
     * `how_many` is the row's total either way: typed when "sex and age disaggregation does not
     * apply", computed as women + men when it does. Youth is a SUBSET of women/men — the form says
     * "the value of Youth cannot be greater than total of Women" — so summing gender columns here
     * would double-count every young person. Reading how_many avoids the question entirely.
     */
    it('reads only how_many, whichever way the row was filled', () => {
      expect(
        deriveInnovationUseTotal([
          { how_many: 100, women: 60, men: 40, women_youth: 30 } as never,
        ]),
      ).toBe(100);
    });

    it('treats an empty list, nulls and non-numerics as zero', () => {
      expect(deriveInnovationUseTotal([])).toBe(0);
      expect(deriveInnovationUseTotal(null)).toBe(0);
      expect(
        deriveInnovationUseTotal([{ how_many: null }, { how_many: 'x' }]),
      ).toBe(0);
    });

    it('reads the bigint column as a number, not a string', () => {
      expect(
        deriveInnovationUseTotal([{ how_many: '120' }, { how_many: '80' }]),
      ).toBe(200);
    });

    it('is reachable through deriveAchievedValue', () => {
      expect(
        deriveAchievedValue({
          resultTypeId: ResultTypeEnum.INNOVATION_USE,
          innovationUseActors: [{ how_many: 203100 }],
        }),
      ).toEqual({ derivable: true, value: 203100 });
    });
  });

  /**
   * The PO's rule: boxes add up, they are not repeated. 120 in one and 80 in another means the
   * result reached 200 people, and 200 is what the type-specific section should say.
   */
  describe('comparing the SUM of the boxes, not each box', () => {
    const capDev = {
      resultTypeId: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      capacityDevelopment: { female_using: 120, male_using: 80 },
    };

    it('matches when the boxes add up to the section total', () => {
      const result = compareResultTotal(capDev, [
        { contributingIndicator: 120 },
        { contributingIndicator: 80 },
      ]);

      expect(result.status).toBe('MATCH');
      expect(result.reported).toBe(200);
      expect(result.boxesCounted).toBe(2);
    });

    // Comparing box by box would have flagged BOTH of these as differing from 200.
    it('does not flag each box separately against the full total', () => {
      expect(
        compareResultTotal(capDev, [
          { contributingIndicator: 120 },
          { contributingIndicator: 80 },
        ]).status,
      ).not.toBe('DIFFERS');
    });

    it('flags a genuine shortfall', () => {
      const result = compareResultTotal(capDev, [
        { contributingIndicator: 120 },
        { contributingIndicator: 30 },
      ]);

      expect(result.status).toBe('DIFFERS');
      expect(result.expected).toBe(200);
      expect(result.reported).toBe(150);
    });

    /**
     * The mixed case. Nothing restricts the indicator picker to the result's own type — it filters
     * by level only — so a Capacity Sharing result can carry an Innovation Development indicator.
     * Section 4 holds only Capacity Sharing data, so that box has no counterpart.
     */
    it('excludes boxes whose indicator is of another type, and says how many', () => {
      const result = compareResultTotal(capDev, [
        {
          contributingIndicator: 120,
          indicatorResultTypeId:
            ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        },
        {
          contributingIndicator: 80,
          indicatorResultTypeId:
            ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        },
        {
          contributingIndicator: 999,
          indicatorResultTypeId: ResultTypeEnum.INNOVATION_DEVELOPMENT,
        },
      ]);

      expect(result.status).toBe('MATCH');
      expect(result.reported).toBe(200);
      expect(result.boxesCounted).toBe(2);
      expect(result.boxesTotal).toBe(3);
      expect(result.boxesOfAnotherType).toBe(1);
    });

    it('stays quiet when every box belongs to another type', () => {
      const result = compareResultTotal(capDev, [
        {
          contributingIndicator: 999,
          indicatorResultTypeId: ResultTypeEnum.POLICY_CHANGE,
        },
      ]);

      expect(result.status).toBe('NOTHING_TO_COMPARE');
      expect(result.boxesOfAnotherType).toBe(1);
    });

    it('stays quiet when no box has been filled in yet', () => {
      const result = compareResultTotal(capDev, [
        { contributingIndicator: null },
        { contributingIndicator: '' },
      ]);

      expect(result.status).toBe('NOTHING_TO_COMPARE');
      expect(result.boxesCounted).toBe(0);
      expect(result.boxesTotal).toBe(2);
    });

    it('stays quiet on a result with no boxes at all', () => {
      expect(compareResultTotal(capDev, []).status).toBe('NOTHING_TO_COMPARE');
      expect(compareResultTotal(capDev, null).status).toBe(
        'NOTHING_TO_COMPARE',
      );
    });

    it('still honours the documented 0 on a Knowledge Product', () => {
      const result = compareResultTotal(
        { resultTypeId: ResultTypeEnum.KNOWLEDGE_PRODUCT },
        [{ contributingIndicator: 0 }],
      );

      expect(result.status).toBe('ALLOWED_EXCEPTION');
      expect(shouldShowComparison(result)).toBe(false);
    });

    it('stays quiet for Policy Change, which still has nothing to compare', () => {
      expect(
        compareResultTotal({ resultTypeId: ResultTypeEnum.POLICY_CHANGE }, [
          { contributingIndicator: 5 },
        ]).status,
      ).toBe('NOTHING_TO_COMPARE');
    });
  });
});
