import { buildDecisionBody, isDecidable, classifyAccept, bellAcceptMode, declineMode, isP25, bellHandoffUrl, acceptLabelFor, primaryReviewTarget } from './request-decision';

/**
 * BELL-T-1 (`notifications/bell-quick-inbox`): table-driven spec for the pure request-decision
 * helper, extracted from `notification-item.component.ts` (`acceptOrReject`/`invalidateRequest`).
 *
 * Parity note: the `buildDecisionBody` expected literals below are captured BY HAND from the
 * pre-refactor `acceptOrReject()` body-construction code (read at
 * `notification-item.component.ts:1355-1369`, before this task's delegation), not derived from the
 * new util — they are the independent source of truth the Falsifier requires.
 */

describe('request-decision utils', () => {
  // Four row kinds the design.md §6.2 "Branch routing" table names.
  const tocCarriedRow = {
    request_type: 'contribution',
    is_map_to_toc: true,
    obj_result: { source_name: 'W1/W2' }
  };

  const primaryRow = {
    request_type: 'primary',
    is_map_to_toc: false,
    obj_result: { source_name: 'W3/Bilaterals' }
  };

  const bilateralContributorRow = {
    request_type: 'contribution',
    is_map_to_toc: false,
    obj_result: { source_name: 'W3/Bilaterals' }
  };

  const legacyRow = {
    request_type: 'contribution',
    is_map_to_toc: false,
    obj_result: { source_name: 'W1/W2' }
  };

  describe('buildDecisionBody() — parity with the pre-refactor acceptOrReject() body', () => {
    it('ToC-carried row, accept', () => {
      expect(buildDecisionBody(tocCarriedRow, true)).toEqual({
        result_request: tocCarriedRow,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 2
      });
    });

    it('ToC-carried row, decline (non-primary — no justification key at all)', () => {
      expect(buildDecisionBody(tocCarriedRow, false)).toEqual({
        result_request: tocCarriedRow,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 3
      });
    });

    it('bilateral contributor (non-primary) row, accept', () => {
      expect(buildDecisionBody(bilateralContributorRow, true)).toEqual({
        result_request: bilateralContributorRow,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 2
      });
    });

    it('bilateral contributor (non-primary) row, decline — still no justification key', () => {
      expect(buildDecisionBody(bilateralContributorRow, false)).toEqual({
        result_request: bilateralContributorRow,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 3
      });
    });

    it('legacy row, accept', () => {
      expect(buildDecisionBody(legacyRow, true)).toEqual({
        result_request: legacyRow,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 2
      });
    });

    it('legacy row, decline', () => {
      expect(buildDecisionBody(legacyRow, false)).toEqual({
        result_request: legacyRow,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 3
      });
    });

    it('primary row, accept — primary never carries a justification (accept is never a decline)', () => {
      expect(buildDecisionBody(primaryRow, true)).toEqual({
        result_request: primaryRow,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 2
      });
    });

    it('primary row, decline — gains the `justification` key from opts', () => {
      expect(buildDecisionBody(primaryRow, false, { justification: 'Not enough evidence' })).toEqual({
        result_request: primaryRow,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 3,
        justification: 'Not enough evidence'
      });
    });

    it('an isUpdateSource-tagged row is never treated as primary, even with request_type:"primary"', () => {
      const updateShapedLikePrimary = { source: 'update', request_type: 'primary' };
      expect(buildDecisionBody(updateShapedLikePrimary, false, { justification: 'x' })).toEqual({
        result_request: updateShapedLikePrimary,
        result_toc_result: { planned_result: null, result_toc_results: [] },
        request_status_id: 3
      });
    });
  });

  describe('classifyAccept() — table-driven over the 4 request kinds', () => {
    it.each([
      ['ToC-carried', tocCarriedRow, 'one-click'],
      ['primary', primaryRow, 'one-click'],
      ['bilateral contributor, not carried (is_map_to_toc:false)', bilateralContributorRow, 'step'],
      ['legacy (non-bilateral, is_map_to_toc:false)', legacyRow, 'step']
    ] as const)('%s → %s', (_label, row, expected) => {
      expect(classifyAccept(row)).toBe(expected);
    });

    it('Falsifier: a bilateral non-primary row with is_map_to_toc:false is "step", never "one-click"', () => {
      expect(classifyAccept(bilateralContributorRow)).toBe('step');
    });
  });

  describe('bellAcceptMode() — BELL-T-9: only a primary request is one-click in the bell', () => {
    it.each([
      ['ToC-carried', tocCarriedRow, 'handoff'],
      ['primary', primaryRow, 'one-click'],
      ['bilateral contributor, not carried (is_map_to_toc:false)', bilateralContributorRow, 'handoff'],
      ['legacy (non-bilateral, is_map_to_toc:false)', legacyRow, 'handoff'],
      ['an update-source row tagged primary', { source: 'update', request_type: 'primary' }, 'handoff']
    ] as const)('%s → %s', (_label, row, expected) => {
      expect(bellAcceptMode(row)).toBe(expected);
    });

    it('classifyAccept stays the inbox/T-7 source: ToC-carried is still one-click there', () => {
      expect(classifyAccept(tocCarriedRow)).toBe('one-click');
      expect(classifyAccept(primaryRow)).toBe('one-click');
    });
  });

  describe('declineMode() — table-driven over the 4 request kinds', () => {
    it.each([
      ['ToC-carried', tocCarriedRow, 'inline'],
      ['primary', primaryRow, 'justify'],
      ['bilateral contributor', bilateralContributorRow, 'inline'],
      ['legacy', legacyRow, 'inline']
    ] as const)('%s → %s', (_label, row, expected) => {
      expect(declineMode(row)).toBe(expected);
    });

    it('Falsifier: a primary row always declineMode === "justify"', () => {
      expect(declineMode(primaryRow)).toBe('justify');
    });
  });

  describe('isP25()', () => {
    it('true when obj_version.obj_portfolio.acronym is "P25"', () => {
      expect(isP25({ obj_result: { obj_version: { obj_portfolio: { acronym: 'P25' } } } })).toBe(true);
    });

    it('false for P22 and for a missing portfolio', () => {
      expect(isP25({ obj_result: { obj_version: { obj_portfolio: { acronym: 'P22' } } } })).toBe(false);
      expect(isP25({})).toBe(false);
    });
  });

  describe('isDecidable()', () => {
    const baseCtx = { isAdmin: false, platformIsClosed: false, currentPhaseId: '30', ipsrCurrentPhaseId: '99' };

    it('Falsifier: non-admin user, a result in a past phase, status_id 1 → false', () => {
      const row = { obj_result: { obj_version: { id: '29' }, status_id: 1 } };
      expect(isDecidable(row, baseCtx)).toBe(false);
    });

    it('true for a non-admin whose row IS in the current reporting phase', () => {
      const row = { obj_result: { obj_version: { id: '30' }, status_id: 1 } };
      expect(isDecidable(row, baseCtx)).toBe(true);
    });

    it('true for a non-admin out-of-phase row whose result status_id is 3 (the phase-mismatch exemption)', () => {
      const row = { obj_result: { obj_version: { id: '29' }, status_id: 3 } };
      expect(isDecidable(row, baseCtx)).toBe(true);
    });

    it('true for an admin regardless of phase mismatch', () => {
      const row = { obj_result: { obj_version: { id: '29' }, status_id: 1 } };
      expect(isDecidable(row, { ...baseCtx, isAdmin: true })).toBe(true);
    });

    it('false when platformIsClosed, even for an admin on the current phase', () => {
      const row = { obj_result: { obj_version: { id: '30' }, status_id: 1 } };
      expect(isDecidable(row, { ...baseCtx, isAdmin: true, platformIsClosed: true })).toBe(false);
    });

    it('false when the row is QAed (status_id 2 and request_status_id 1), even on the current phase', () => {
      const row = { obj_result: { obj_version: { id: '30' }, status_id: 2 }, request_status_id: 1 };
      expect(isDecidable(row, baseCtx)).toBe(false);
    });

    it('uses ipsrCurrentPhaseId instead of currentPhaseId for an IPSR result (obj_result_type.id 10/11)', () => {
      const row = { obj_result: { obj_version: { id: '99' }, status_id: 1, obj_result_type: { id: 10 } } };
      // '99' matches ipsrCurrentPhaseId, not currentPhaseId — only decidable if the IPSR id was used.
      expect(isDecidable(row, baseCtx)).toBe(true);
    });
  });
  // BELL-T-5 (`BELL-DD-4`): the hand-off URL the bell navigates to. Expected strings are written by
  // hand from design.md §6.1 / tasks.md BELL-T-5's Falsifier, never rebuilt with the util's own logic.
  describe('bellHandoffUrl()', () => {
    const base = '/result/results-outlet/results-notifications';

    it('accept for a request in phase 30 / id 77 -> the exact URL (phase from obj_version.id, the server payload shape)', () => {
      const row = { share_result_request_id: 77, obj_result: { obj_version: { id: 30 } } };
      expect(bellHandoffUrl(row, 'accept')).toBe(`${base}?phase=30&request=77&action=accept`);
    });

    it('decline -> action=decline', () => {
      const row = { share_result_request_id: 77, obj_result: { obj_version: { id: '30' } } };
      expect(bellHandoffUrl(row, 'decline')).toBe(`${base}?phase=30&request=77&action=decline`);
    });

    it('falls back to obj_result.version_id when obj_version is absent (task text shape)', () => {
      const row = { share_result_request_id: 77, obj_result: { version_id: 30 } };
      expect(bellHandoffUrl(row, 'accept')).toBe(`${base}?phase=30&request=77&action=accept`);
    });

    it('always carries phase: a row whose phase is known never yields a phase-less URL', () => {
      const row = { share_result_request_id: 77, obj_result: { obj_version: { id: 30 } } };
      expect(bellHandoffUrl(row, 'accept')).toContain('phase=30');
    });

    it('tolerates the bell kind tag (and any extra field) on the row', () => {
      const row = { kind: 'decision', share_result_request_id: 77, obj_result: { obj_version: { id: 30 } } };
      expect(bellHandoffUrl(row, 'accept')).toBe(`${base}?phase=30&request=77&action=accept`);
    });
  });
  // PRA-R-3 / design §8.1: where "Review result" leads once the accept settled.
  describe('primaryReviewTarget()', () => {
    it('Pending Review (status_id 5) -> review-drawer', () => {
      expect(primaryReviewTarget({ ...primaryRow, obj_result: { ...primaryRow.obj_result, status_id: 5 } })).toBe('review-drawer');
    });
    it('Editing (status_id 1) -> notify-later', () => {
      expect(primaryReviewTarget({ ...primaryRow, obj_result: { ...primaryRow.obj_result, status_id: 1 } })).toBe('notify-later');
    });
    it('a missing result -> notify-later', () => {
      expect(primaryReviewTarget({})).toBe('notify-later');
    });
  });
  // BELL-T-11: single source of the Accept label. Literals are the pre-refactor
  // `notification-item.drawerAcceptLabel()` outputs (+ the template `?? 'Accept contribution'`).
  describe('acceptLabelFor() — parity with the inbox row label', () => {
    it('primary request -> "Review result" (PRA-R-3)', () => {
      expect(acceptLabelFor(primaryRow)).toBe('Review result');
    });
    it('bilateral contributor -> "Accept"', () => {
      expect(acceptLabelFor(bilateralContributorRow)).toBe('Accept');
    });
    it('W1/W2 row -> "Accept contribution"', () => {
      expect(acceptLabelFor(legacyRow)).toBe('Accept contribution');
    });
    it('ToC-carried W1/W2 row -> "Accept contribution"', () => {
      expect(acceptLabelFor(tocCarriedRow)).toBe('Accept contribution');
    });
    it('an update-source row is never primary, even with request_type primary', () => {
      expect(acceptLabelFor({ source: 'update', request_type: 'primary', obj_result: { source_name: 'W1/W2' } })).toBe('Accept contribution');
      expect(acceptLabelFor({ source: 'update', request_type: 'primary', obj_result: { source_name: 'W3/Bilaterals' } })).toBe('Accept');
    });
    it('tolerates a missing row', () => {
      expect(acceptLabelFor(undefined)).toBe('Accept contribution');
    });
  });
});
