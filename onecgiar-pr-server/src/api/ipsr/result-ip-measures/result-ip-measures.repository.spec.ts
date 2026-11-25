import { DataSource } from 'typeorm';
import { ResultIpMeasureRepository } from './result-ip-measures.repository';

describe('ResultIpMeasureRepository (unit)', () => {
  let repo: ResultIpMeasureRepository;
  let repoQuery: jest.Mock;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
    query: jest.fn(),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn((e) => e),
  } as any;

  beforeEach(() => {
    (mockDataSource.createEntityManager as any).mockClear?.();
    (mockDataSource.query as any).mockClear?.();
    repo = new ResultIpMeasureRepository(mockDataSource, mockHandlersError);
    repoQuery = jest.fn();
    // Override BaseRepository.query method
    (repo as any).query = repoQuery;
  });

  it('constructs repository', () => {
    expect(repo).toBeDefined();
    expect((mockDataSource.createEntityManager as any).mock.calls.length).toBe(
      1,
    );
  });

  it('fisicalDelete issues delete query', async () => {
    repoQuery.mockResolvedValueOnce({ ok: true });
    const res = await repo.fisicalDelete(123);
    expect(repoQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = repoQuery.mock.calls[0];
    expect(sql.toLowerCase()).toContain('delete rim');
    expect(params).toEqual([123]);
    expect(res).toEqual({ ok: true });
  });

  it('logicalDelete issues update query', async () => {
    repoQuery.mockResolvedValueOnce({ ok: true });
    const res = await repo.logicalDelete(456);
    const [sql, params] = repoQuery.mock.calls[0];
    expect(sql.toLowerCase()).toContain('update result_ip_measure rim');
    expect(params).toEqual([456]);
    expect(res).toEqual({ ok: true });
  });

  describe('createQueries (replication)', () => {
    const baseConfig = {
      phase: 5,
      user: { id: 77 } as any,
      old_result_id: 1000,
      new_result_id: 2000,
    } as any;

    const withIpsr = { ...baseConfig, new_ipsr_id: 3000 } as any;
    const withoutIpsr = { ...baseConfig } as any;

    const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

    const insertColumns = (insertQuery: string) =>
      normalize(insertQuery)
        .match(/result_ip_measure \((.*?)\)/)?.[1]
        .split(',')
        .map((c) => c.trim());

    const insertSelectItems = (insertQuery: string) =>
      normalize(insertQuery)
        .match(/\) SELECT (.*?) FROM result_ip_measure/)?.[1]
        .split(',')
        .map((c) => c.trim());

    it.each([
      ['new_ipsr_id set', withIpsr],
      ['new_ipsr_id unset', withoutIpsr],
    ])('carries section_id in findQuery (%s)', (_label, config) => {
      const { findQuery } = repo.createQueries(config);
      const sql = normalize(findQuery);

      expect(sql).toContain('2000 AS result_id, section_id');
      expect(sql).toContain('FROM result_ip_measure');
      expect(sql).toContain('result_id = 1000');
      expect(sql).toContain('AND is_active > 0');
    });

    it.each([
      ['new_ipsr_id set', withIpsr],
      ['new_ipsr_id unset', withoutIpsr],
    ])(
      'carries section_id on both halves of insertQuery (%s)',
      (_label, config) => {
        const { insertQuery } = repo.createQueries(config);

        expect(insertColumns(insertQuery)).toContain('section_id');
        expect(insertSelectItems(insertQuery)).toContain('section_id');
        expect(normalize(insertQuery)).toContain(
          '2000 AS result_id, section_id',
        );
      },
    );

    it.each([
      ['new_ipsr_id set', withIpsr, 10],
      ['new_ipsr_id unset', withoutIpsr, 10],
    ])(
      'keeps the INSERT name list aligned with the SELECT list (%s)',
      (_label, config, expected) => {
        const { insertQuery } = repo.createQueries(config as any);

        const columns = insertColumns(insertQuery);
        const items = insertSelectItems(insertQuery);

        expect(columns).toHaveLength(expected as number);
        expect(items).toHaveLength(expected as number);
        expect(columns[columns.length - 1]).toBe('section_id');
        expect(items[items.length - 1]).toBe('section_id');
      },
    );

    it('keeps the result_ip_id conditional untouched on the set branch', () => {
      const { findQuery, insertQuery } = repo.createQueries(withIpsr);
      const sql = normalize(insertQuery);

      // the insert half interpolates new_result_id (not new_ipsr_id) into
      // result_ip_id, while findQuery interpolates new_ipsr_id: existing
      // asymmetry, asserted here so appending section_id cannot shift it
      expect(sql).not.toContain('NULL AS result_ip_id');
      expect(insertSelectItems(insertQuery)[7]).toBe('2000 AS result_ip_id');
      expect(normalize(findQuery)).toContain('3000 AS result_ip_id');
    });

    it('keeps the result_ip_id conditional untouched on the unset branch', () => {
      const { insertQuery } = repo.createQueries(withoutIpsr);
      const sql = normalize(insertQuery);

      expect(sql).toContain('NULL AS result_ip_id');
      expect(insertSelectItems(insertQuery)[7]).toBe('NULL AS result_ip_id');
    });

    it('returns the measures of the new result', () => {
      const { returnQuery } = repo.createQueries(withIpsr);
      const sql = normalize(returnQuery);

      expect(sql).toContain('result_ip_measure_id');
      expect(sql).toContain('result_id = 2000');
    });
  });

  describe('Innovation Use 2026 stop-copy (IU26-R-9)', () => {
    const baseConfig = {
      phase: 5,
      user: { id: 77 } as any,
      old_result_id: 1000,
      new_result_id: 2000,
    } as any;
    const withIpsr = { ...baseConfig, new_ipsr_id: 3000 } as any;
    const norm = (sql: string) => sql.replace(/\s+/g, ' ').trim();

    it.each(['findQuery', 'insertQuery'] as const)(
      'copies only section 2 in the %s when phase_year is 2026',
      (key) => {
        const sql = norm(
          repo.createQueries({ ...baseConfig, phase_year: 2026 })[key],
        );
        expect(sql).toContain('AND is_active > 0 AND section_id = 2');
      },
    );

    it.each([2025, undefined])(
      'copies every section when phase_year is %s (and for IPSR configs)',
      (phase_year) => {
        const { findQuery, insertQuery } = repo.createQueries({
          ...withIpsr,
          phase_year,
        });
        expect(norm(findQuery)).not.toContain('section_id = 2');
        expect(norm(insertQuery)).not.toContain('section_id = 2');
      },
    );
  });
});
