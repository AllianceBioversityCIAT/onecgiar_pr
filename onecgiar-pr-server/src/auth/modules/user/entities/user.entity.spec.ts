import { DataSource } from 'typeorm';
import { Result } from '../../../../api/results/entities/result.entity';
import { User } from './user.entity';

/**
 * PWD-TEST-1 (spec bugfix/user-password-in-responses): the stored password hash
 * must never be part of the SQL TypeORM generates for a User load, whether the
 * User is the root entity or a relation of another entity (for example
 * `Result.obj_created` / `Result.obj_external_submitter`, which the bilateral
 * endpoints serialise as-is).
 *
 * Metadata is built OFFLINE: no connection is ever opened. Assertions are made
 * on the generated SQL text only.
 */
describe('User entity: password hash is not selectable by default', () => {
  let dataSource: DataSource;

  beforeAll(() => {
    dataSource = new DataSource({
      type: 'mysql',
      database: 'metadata_only_never_connected',
      entities: [
        `${__dirname}/../../../../api/**/*.entity{.ts,.js}`,
        `${__dirname}/../../../../auth/**/*.entity{.ts,.js}`,
        `${__dirname}/../../../../clarisa/**/*.entity{.ts,.js}`,
        `${__dirname}/../../../../toc/**/*.entity{.ts,.js}`,
      ],
    });
    // buildMetadatas() is protected; it loads entity metadata without connecting.
    return (dataSource as any).buildMetadatas();
  }, 120_000);

  it('(a) Result loaded with obj_created and obj_external_submitter relations does not select password', () => {
    const sql = dataSource
      .getRepository(Result)
      .createQueryBuilder('result')
      .setFindOptions({
        relations: { obj_created: true, obj_external_submitter: true },
      })
      .getQuery();

    // Guard against a vacuous pass: both User relations must really be joined.
    expect(sql).toMatch(/JOIN `users`/i);
    expect(sql).not.toMatch(/password/i);
  }, 120_000);

  it('(b) plain User query builder does not select password', () => {
    const sql = dataSource
      .getRepository(User)
      .createQueryBuilder('u')
      .getQuery();

    expect(sql).toMatch(/`u`\.`email`/);
    expect(sql).not.toMatch(/password/i);
  }, 120_000);

  it('(c) explicit addSelect is the only way to read password', () => {
    const sql = dataSource
      .getRepository(User)
      .createQueryBuilder('u')
      .addSelect('u.password')
      .getQuery();

    expect(sql).toMatch(/password/i);
  }, 120_000);
});
