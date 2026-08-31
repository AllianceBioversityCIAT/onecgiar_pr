import { DataSource } from 'typeorm';
import { ResultActorRepository } from './result-actors.repository';

describe('ResultActorRepository (unit)', () => {
  let repo: ResultActorRepository;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
    query: jest.fn(),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn((e) => e),
  } as any;

  const config = {
    phase: 5,
    user: { id: 77 },
    old_result_id: 1000,
    new_result_id: 2000,
  } as any;

  const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    (mockDataSource.createEntityManager as any).mockClear?.();
    (mockDataSource.query as any).mockClear?.();
    repo = new ResultActorRepository(mockDataSource, mockHandlersError);
  });

  it('constructs repository', () => {
    expect(repo).toBeDefined();
  });

  describe('createQueries', () => {
    it('selects section_id in the findQuery', () => {
      const { findQuery } = repo.createQueries(config);

      expect(normalize(findQuery)).toContain('section_id');
    });

    it('names section_id in the INSERT column list', () => {
      const { insertQuery } = repo.createQueries(config);
      const columnList = /result_actors \((.*?)\)/.exec(
        normalize(insertQuery),
      )?.[1];

      expect(columnList).toBeDefined();
      expect(columnList.split(',').map((c) => c.trim())).toContain(
        'section_id',
      );
    });

    it('selects section_id in the insertQuery SELECT half', () => {
      const { insertQuery } = repo.createQueries(config);
      const selectList = /\) SELECT (.*?) FROM/.exec(
        normalize(insertQuery),
      )?.[1];

      expect(selectList).toBeDefined();
      expect(selectList.split(',').map((c) => c.trim())).toContain(
        'section_id',
      );
    });

    it('keeps the INSERT column list aligned with its SELECT list', () => {
      const { insertQuery } = repo.createQueries(config);
      const sql = normalize(insertQuery);
      const columnList = /result_actors \((.*?)\)/.exec(sql)?.[1];
      const selectList = /\) SELECT (.*?) FROM/.exec(sql)?.[1];

      const columns = columnList.split(',');
      const selected = selectList.split(',');

      expect(columns).toHaveLength(19);
      expect(selected).toHaveLength(columns.length);
    });

    it('keeps the existing replication scope untouched', () => {
      const { findQuery, insertQuery } = repo.createQueries(config);

      for (const sql of [normalize(findQuery), normalize(insertQuery)]) {
        expect(sql).toContain('2000 AS result_id');
        expect(sql).toContain('result_id = 1000');
        expect(sql).toContain('AND is_active > 0');
      }
    });

    it('returns the new rows through returnQuery', () => {
      const { returnQuery } = repo.createQueries(config);
      const sql = normalize(returnQuery);

      expect(sql).toContain('result_actors_id');
      expect(sql).toContain('result_id = 2000');
    });
  });
});
