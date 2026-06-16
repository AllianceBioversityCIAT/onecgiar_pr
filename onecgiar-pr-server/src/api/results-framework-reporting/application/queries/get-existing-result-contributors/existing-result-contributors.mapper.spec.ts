import {
  mapContributorRecords,
  sumContributingIndicatorForTocIndicator,
} from './existing-result-contributors.mapper';

describe('existing-result-contributors.mapper', () => {
  describe('sumContributingIndicatorForTocIndicator', () => {
    it('should sum active contributing_indicator values for the requested indicator', () => {
      const contrib = {
        obj_results_toc_result_indicators: [
          {
            toc_results_indicator_id: 'IND-55',
            obj_result_indicator_targets: [
              { contributing_indicator: 2.5, is_active: true },
              { contributing_indicator: 1, is_active: true },
              { contributing_indicator: 99, is_active: false },
            ],
          },
          {
            toc_results_indicator_id: 'IND-OTHER',
            obj_result_indicator_targets: [
              { contributing_indicator: 100, is_active: true },
            ],
          },
        ],
      };

      expect(sumContributingIndicatorForTocIndicator(contrib, 'IND-55')).toBe(
        3.5,
      );
    });

    it('should return null when no finite contributing values exist', () => {
      const contrib = {
        obj_results_toc_result_indicators: [
          {
            toc_results_indicator_id: 'IND-55',
            obj_result_indicator_targets: [
              { contributing_indicator: null, is_active: true },
              { contributing_indicator: undefined, is_active: true },
            ],
          },
        ],
      };

      expect(
        sumContributingIndicatorForTocIndicator(contrib, 'IND-55'),
      ).toBeNull();
    });
  });

  describe('mapContributorRecords', () => {
    it('should map contributor records with role and aggregated indicator', () => {
      const contributors = [
        {
          result_toc_result_id: 11,
          result_id: 101,
          toc_result_id: 5,
          obj_results: {
            title: 'Result Alpha',
            result_code: 'RES-101',
            version_id: 30,
            status_id: 2,
            obj_status: { status_name: 'Submitted' },
          },
          obj_results_toc_result_indicators: [
            {
              toc_results_indicator_id: 'IND-55',
              obj_result_indicator_targets: [
                { contributing_indicator: 2, is_active: true },
              ],
            },
          ],
        },
      ];

      const rolesByResult = new Map([[101, { role_id: 4, role_name: 'Lead' }]]);

      expect(
        mapContributorRecords(
          contributors as any,
          rolesByResult,
          null,
          'IND-55',
        ),
      ).toEqual([
        {
          result_id: 101,
          title: 'Result Alpha',
          result_code: 'RES-101',
          status_name: 'Submitted',
          version_id: 30,
          status_id: 2,
          role_id: 4,
          contributing_indicator: 2,
        },
      ]);
    });

    it('should use general application role when result role is missing', () => {
      const contributors = [
        {
          result_toc_result_id: 31,
          result_id: 501,
          toc_result_id: 7,
          obj_results: {
            title: 'Result Delta',
            result_code: 'RES-501',
            version_id: 10,
            status_id: 6,
            obj_status: { status_name: 'Approved' },
          },
        },
      ];

      expect(
        mapContributorRecords(contributors as any, new Map(), 1, 'IND-12'),
      ).toEqual([
        expect.objectContaining({
          result_id: 501,
          role_id: 1,
          contributing_indicator: null,
        }),
      ]);
    });
  });
});
