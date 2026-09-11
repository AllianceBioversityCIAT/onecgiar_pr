import { DataSource } from 'typeorm';
import { ResultByIntitutionsTypeRepository } from './result_by_intitutions_type.repository';

describe('ResultByIntitutionsTypeRepository (unit)', () => {
  let repo: ResultByIntitutionsTypeRepository;

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
    repo = new ResultByIntitutionsTypeRepository(
      mockDataSource,
      mockHandlersError,
    );
  });

  describe('createQueries (replication)', () => {
    const config = {
      user: { id: 77 } as any,
      old_result_id: 1000,
      new_result_id: 2000,
    } as any;

    const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

    // the column name list of the INSERT, e.g. "is_active, creation_date, ..."
    const insertColumnNames = (insertQuery: string) =>
      normalize(insertQuery)
        .match(/insert into results_by_institution_type \((.*?)\)/)?.[1]
        .split(',')
        .map((c) => c.trim());

    // the projection of the INSERT ... SELECT, e.g. "rbit.is_active, now() as creation_date, ..."
    const insertSelectItems = (insertQuery: string) =>
      normalize(insertQuery)
        .match(
          /\)\s*select\s+(.*?)\s+from results_by_institution_type rbit/,
        )?.[1]
        .split(',')
        .map((c) => c.trim());

    it('carries section_id in findQuery', () => {
      const { findQuery } = repo.createQueries(config);

      expect(normalize(findQuery)).toContain('rbit.section_id');
    });

    it('carries section_id in the INSERT column list', () => {
      const { insertQuery } = repo.createQueries(config);

      expect(insertColumnNames(insertQuery)).toContain('section_id');
    });

    it('carries section_id in the INSERT ... SELECT projection', () => {
      const { insertQuery } = repo.createQueries(config);

      expect(insertSelectItems(insertQuery)).toContain('rbit.section_id');
    });

    it('keeps the INSERT column list and its SELECT projection in parity', () => {
      const { insertQuery } = repo.createQueries(config);

      // parity holds ONLY between these two lists. findQuery legitimately
      // carries one extra expression (`null as id`) and must not be compared.
      expect(insertColumnNames(insertQuery)).toHaveLength(12);
      expect(insertSelectItems(insertQuery)).toHaveLength(
        insertColumnNames(insertQuery).length,
      );
    });

    it('remaps the rows to the new result without touching the rest', () => {
      const { insertQuery } = repo.createQueries(config);
      const sql = normalize(insertQuery);

      expect(sql).toContain('2000 as results_id');
      expect(sql).toContain('77 as created_by');
      expect(sql).toContain('rbit.institution_roles_id');
      expect(sql).toContain('rbit.results_id = 1000');
      expect(sql).toContain('and rbit.is_active > 0');
    });

    it('falls back to now() when no predetermined date is given', () => {
      const { findQuery, insertQuery } = repo.createQueries(config);

      expect(normalize(findQuery)).toContain('now() as creation_date');
      expect(normalize(insertQuery)).toContain('now() as creation_date');
    });

    it('returns the rows of the new result', () => {
      const { returnQuery } = repo.createQueries(config);
      const sql = normalize(returnQuery);

      expect(sql).toContain('select rbit.*');
      expect(sql).toContain('rbit.results_id = 2000');
    });
  });
});
