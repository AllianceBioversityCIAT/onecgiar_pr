import { buildRequestNotificationText } from './request-notification-text';

// @akili-spec bilateral/resubmit-followups — RSF-T-1. Expected strings are LITERALS (spec / today's code).
describe('buildRequestNotificationText', () => {
  const base = {
    obj_requested_by: { first_name: 'Ana', last_name: 'Diaz' },
    obj_owner_initiative: { official_code: 'SP01' },
    obj_shared_inititiative: { official_code: 'SP02' },
    obj_result: { result_code: 9762, title: 'Some title' }
  };

  it('primary (T-7 case): centre acronym, requested SP, primary tail', () => {
    const text = buildRequestNotificationText({
      ...base,
      request_type: 'primary',
      is_map_to_toc: false,
      creating_center: { acronym: 'CIAT', name: 'Tropical Agriculture' },
      obj_owner_initiative: { official_code: 'SP12' },
      obj_shared_inititiative: { official_code: 'SP12' }
    });
    expect(text).toBe('CIAT has tagged SP12 as the primary Science Program of result 9762 - Some title');
    expect(text).not.toContain('as a contributor');
    expect(text).not.toContain('has requested inclusion');
    expect(text).not.toContain('from SP12');
  });

  it('primary: uses the centre name when there is no acronym', () => {
    expect(buildRequestNotificationText({ ...base, request_type: 'primary', creating_center: { acronym: ' ', name: 'Some Centre' } })).toBe(
      'Some Centre has tagged SP02 as the primary Science Program of result 9762 - Some title'
    );
  });

  it.each([[null], [undefined], [{}], [{ acronym: '', name: '' }]])('primary: centre %j falls back to the unknown-centre label', center => {
    const text = buildRequestNotificationText({ ...base, request_type: 'primary', creating_center: center });
    expect(text).toBe('the Center has tagged SP02 as the primary Science Program of result 9762 - Some title');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('()');
  });

  it('contribution (non-map) keeps today text', () => {
    expect(buildRequestNotificationText({ ...base, request_type: 'contribution', is_map_to_toc: false })).toBe(
      'Ana Diaz from SP01 has requested inclusion of SP02 as a contributor to result 9762 - Some title'
    );
  });

  it('absent request_type keeps today text (non-map)', () => {
    expect(buildRequestNotificationText({ ...base, is_map_to_toc: false })).toBe(
      'Ana Diaz from SP01 has requested inclusion of SP02 as a contributor to result 9762 - Some title'
    );
  });

  it('map-to-ToC keeps today text', () => {
    expect(buildRequestNotificationText({ ...base, request_type: 'contribution', is_map_to_toc: true })).toBe(
      'Ana Diaz from SP02 has requested contribution to result 9762 - Some title submitted by SP01'
    );
  });
});
