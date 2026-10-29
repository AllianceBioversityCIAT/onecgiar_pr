import { AdminPanelRepository } from './admin-panel.repository';

// PF2-R-1 — completeness rows carry the Science Program full name next to the code.
describe('AdminPanelRepository.reportResultCompleteness', () => {
  const makeRepo = () => {
    const dataSource = { query: jest.fn().mockResolvedValue([]) } as any;
    const handlersError = {
      returnErrorRepository: jest.fn(() => new Error('repo-error')),
    } as any;
    const repo = new AdminPanelRepository(dataSource, handlersError);
    return { repo, dataSource };
  };

  it('selects ci.name as initiative_name next to official_code, without new bound input', async () => {
    const { repo, dataSource } = makeRepo();

    await repo.reportResultCompleteness({} as any);

    const [sql, params] = dataSource.query.mock.calls[0];
    const flat = String(sql).replace(/\s+/g, ' ');
    expect(flat).toContain('ci.official_code, ci.name AS initiative_name,');
    expect(params).toEqual(['?']);
  });
});
