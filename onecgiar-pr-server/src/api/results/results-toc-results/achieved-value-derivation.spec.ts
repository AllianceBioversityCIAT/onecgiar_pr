import {
  compareWithReportedData,
  deriveAchievedValue,
  deriveCapacityDevelopmentTotal,
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
  describe('the two types whose rule names a field that does not exist', () => {
    it('refuses to derive Policy Change — no contribution-type selector, no actors-influenced field', () => {
      expect(
        deriveAchievedValue({ resultTypeId: ResultTypeEnum.POLICY_CHANGE }),
      ).toEqual({ derivable: false, reason: 'NO_CONTRIBUTION_TYPE_SELECTOR' });
    });

    it('refuses to derive Innovation Use — no reporting-option toggle, both figures are lists', () => {
      expect(
        deriveAchievedValue({ resultTypeId: ResultTypeEnum.INNOVATION_USE }),
      ).toEqual({ derivable: false, reason: 'NO_REPORTING_OPTION_SELECTOR' });
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
      expect(
        compareWithReportedData(
          { resultTypeId: ResultTypeEnum.INNOVATION_USE },
          999,
        ).status,
      ).toBe('NOTHING_TO_COMPARE');
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
