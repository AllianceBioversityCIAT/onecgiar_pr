import { DataSource } from 'typeorm';
import { IpsrRepository } from './ipsr.repository';

describe('IpsrRepository (repository/ipsr.repository.ts)', () => {
  it('constructs with DataSource and exposes Repository APIs', () => {
    const mockDataSource = {
      createEntityManager: jest.fn(() => ({} as any)),
    } as unknown as DataSource;
    const mockHandlersError = { returnErrorRepository: jest.fn() } as any;

    const repo = new IpsrRepository(mockDataSource, mockHandlersError);
    expect(repo).toBeDefined();
    // ensure underlying manager was requested
    expect((mockDataSource as any).createEntityManager).toHaveBeenCalled();
    // basic Repository methods should exist
    expect(typeof (repo as any).query).toBe('function');
    expect(typeof repo.findOne).toBe('function');
  });
});

