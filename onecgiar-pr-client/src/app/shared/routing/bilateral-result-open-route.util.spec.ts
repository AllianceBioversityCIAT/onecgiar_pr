import {
  classifyBilateralOpenRoute,
  isW3BilateralForUpdate,
  resolveBilateralResultOpenRoute,
  usesBilateralReviewFlow
} from './bilateral-result-open-route.util';

describe('bilateral-result-open-route.util', () => {
  const editingW3 = {
    sourceOrOrigin: 'W3/Bilaterals',
    statusId: 1,
    statusName: 'Editing',
    leadCenter: 'AfricaRice',
    resultCode: '9368',
    versionId: '36',
    submitterCode: 'SP01',
    resultId: 9368
  };

  const submittedW3 = {
    sourceOrOrigin: 'W3/Bilaterals',
    statusName: 'Submitted',
    leadCenter: 'ILRI',
    resultCode: '5003',
    versionId: '11',
    submitterCode: 'SP01',
    resultId: 3
  };

  it('routes Editing W3 with lead center to the bilateral center editor', () => {
    expect(classifyBilateralOpenRoute(editingW3)).toBe('center-editor');
    expect(resolveBilateralResultOpenRoute(editingW3)).toEqual({
      kind: 'center-editor',
      commands: ['/bilateral', 'AfricaRice', 'result', '9368'],
      queryParams: { phase: '36' }
    });
    expect(usesBilateralReviewFlow(editingW3)).toBe(false);
  });

  it('routes Draft W3 to the center editor', () => {
    const draft = { ...editingW3, statusId: 8, statusName: 'Draft' };
    expect(classifyBilateralOpenRoute(draft)).toBe('center-editor');
  });

  it('routes in-review W3 to the bilateral review drawer', () => {
    expect(classifyBilateralOpenRoute(submittedW3)).toBe('review-drawer');
    expect(resolveBilateralResultOpenRoute(submittedW3)).toEqual({
      kind: 'review-drawer',
      commands: ['/result-framework-reporting', 'entity-details', 'SP01', 'bilateral-review'],
      queryParams: { reviewResult: '5003', reviewResultId: 3 }
    });
    expect(usesBilateralReviewFlow(submittedW3)).toBe(true);
  });

  const approvedW3 = {
    sourceOrOrigin: 'W3/Bilaterals',
    statusId: 6,
    statusName: 'Approved',
    leadCenter: 'CIMMYT',
    resultCode: 28728,
    versionId: 6,
    submitterCode: 'SP01',
    resultId: 28728
  };
  const approvedCenterEditor = {
    kind: 'center-editor',
    commands: ['/bilateral', 'CIMMYT', 'result', 28728],
    queryParams: { phase: 6 }
  };

  it('routes Approved W3 (name only) with lead center to the center editor', () => {
    const input = { ...approvedW3, statusId: undefined };
    expect(classifyBilateralOpenRoute(input)).toBe('center-editor');
    expect(resolveBilateralResultOpenRoute(input)).toEqual(approvedCenterEditor);
  });

  it('routes Approved W3 (id only, no name) with lead center to the center editor', () => {
    const input = { ...approvedW3, statusName: undefined };
    expect(classifyBilateralOpenRoute(input)).toBe('center-editor');
    expect(resolveBilateralResultOpenRoute(input)).toEqual(approvedCenterEditor);
    expect(usesBilateralReviewFlow(input)).toBe(false);
  });

  it('routes AVISA Approved W3 to Result Detail', () => {
    expect(classifyBilateralOpenRoute({ ...approvedW3, submitterCode: 'SGP-02' })).toBe('result-detail');
  });

  it('routes Approved W3 without lead center to Result Detail', () => {
    expect(classifyBilateralOpenRoute({ ...approvedW3, leadCenter: '  ' })).toBe('result-detail');
  });

  it('routes non-W3 Approved to Result Detail', () => {
    expect(classifyBilateralOpenRoute({ ...approvedW3, sourceOrOrigin: 'Results' })).toBe('result-detail');
  });

  it('falls back to Result Detail when Editing W3 has no lead center', () => {
    const missingCenter = { ...editingW3, leadCenter: '' };
    expect(classifyBilateralOpenRoute(missingCenter)).toBe('result-detail');
    expect(resolveBilateralResultOpenRoute(missingCenter).commands).toEqual([
      '/result',
      'result-detail',
      '9368',
      'general-information'
    ]);
  });

  it('keeps W3 update eligibility broader than review-drawer routing', () => {
    expect(isW3BilateralForUpdate(editingW3)).toBe(true);
    expect(isW3BilateralForUpdate(submittedW3)).toBe(true);
    expect(isW3BilateralForUpdate({ ...submittedW3, statusName: 'Approved' })).toBe(false);
  });
});
