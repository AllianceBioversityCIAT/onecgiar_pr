import { env } from 'process';

describe('Unit test bootstrap', () => {
  it('should rewrite environment variables for tests', () => {
    env.AUTOMATION_DB_TOC = 'test_db_toc';
    env.DB_TOC = undefined;
    rewriteEnvironmentVariables();
    expect(env.DB_TOC).toBe(env.AUTOMATION_DB_TOC);
  });
});

const rewriteEnvironmentVariables = (): void => {
  env.DB_TOC = env.AUTOMATION_DB_TOC;
};
