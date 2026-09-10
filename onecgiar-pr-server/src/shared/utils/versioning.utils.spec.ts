import { VERSIONING, predeterminedDateValidation } from './versioning.utils';

const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('predeterminedDateValidation', () => {
  it('should return now() when no date is provided', () => {
    expect(predeterminedDateValidation(null)).toBe('now()');
    expect(predeterminedDateValidation(undefined)).toBe('now()');
  });

  it('should quote the provided date', () => {
    const date = new Date('2025-03-01T00:00:00.000Z');
    expect(predeterminedDateValidation(date)).toBe(`'${date}'`);
  });
});

describe('VERSIONING.QUERY.Get_latest_qa_result_version', () => {
  const sql = normalize(
    VERSIONING.QUERY.Get_latest_qa_result_version('rbip.result_id'),
  );

  it('should interpolate the received result id expression', () => {
    // once for the result_code lookup, once for the phase_year floor and once
    // for the IFNULL fallback
    expect(sql.match(/rbip\.result_id/g)).toHaveLength(3);
  });

  it('should only consider active Quality Assessed versions', () => {
    expect(sql).toContain('r_lv.is_active = 1');
    expect(sql).toContain('r_lv.status_id = 2');
  });

  it('should match versions by result code', () => {
    expect(sql).toContain(
      'r_lv.result_code = (select r_cur.result_code from result r_cur where r_cur.id = rbip.result_id)',
    );
  });

  it('should never regress to an older phase', () => {
    expect(sql).toContain('v_lv.phase_year >=');
  });

  it('should pick the newest phase year and fall back to the current id', () => {
    expect(sql).toContain('order by v_lv.phase_year desc, r_lv.id desc');
    expect(sql).toContain('limit 1');
    expect(sql.startsWith('IFNULL((')).toBe(true);
    expect(sql.endsWith('), rbip.result_id)')).toBe(true);
  });
});

describe('VERSIONING.QUERY.Get_link_result_qa', () => {
  it('should keep accepting QAed and editing versions ordered by status', () => {
    const sql = normalize(
      VERSIONING.QUERY.Get_link_result_qa('lr.linked_results_id'),
    );
    expect(sql).toContain('r_q1.status_id in (2, 1)');
    expect(sql).toContain('order by r_q1.status_id desc, r_q1.id desc');
  });
});
