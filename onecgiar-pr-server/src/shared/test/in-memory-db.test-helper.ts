import { FindOperator } from 'typeorm';
import { ClosedWorld, createClosedWorld } from './closed-world.test-helper';

/**
 * @akili-spec bilateral/resubmit-rejected-result — RSB-T-4, extended in RSB-T-5.
 *
 * A tiny in-memory model of the tables a spec cares about, behind the two `EntityManager` methods
 * the section reset uses (`find(Entity, { where })` and `update(Entity, where, set)`). It honours
 * the criteria it is given (literals and `In`), so a spec can assert the rows that are left ACTIVE
 * instead of only which calls were made. It is a MODEL of the database, not the database: it
 * proves the code targets the right rows, never that real MySQL agrees (that is RSB-T-7).
 *
 * Anything else a caller tries (`save`, `delete`, `query`, `createQueryBuilder`, ...) is a recorded
 * violation of the closed world (see `closed-world.test-helper.ts`) UNLESS the spec opts in with
 * `{ writes: true }` (RSB-T-5: the final CAS + history `save`, and the real
 * `PrimaryProgramRequestService` running over the same rows). Even then only `find`, `findOne`,
 * `update`, `insert`, `save`, `create` and `getRepository` are answered; `delete`, `remove`,
 * `query` and `createQueryBuilder` stay violations, so a hard delete can never slip in.
 *
 * `dataSource.transaction(work)` models ONE transaction: a throw inside `work` restores every row to
 * its state at entry (the logs `updated` / `inserted` keep the attempt).
 */
export type Row = Record<string, any>;
/** An entity class, the way `EntityManager` takes it as a target. */
export type EntityClass = new (...args: any[]) => unknown;

export interface InMemoryRepository {
  find(options?: {
    where?: Row;
    order?: Record<string, 'ASC' | 'DESC'>;
    take?: number;
  }): Promise<Row[]>;
  findOne(options?: { where?: Row }): Promise<Row | null>;
  update(where: Row | number | string, set: Row): Promise<{ affected: number }>;
  insert(row: Row): Promise<{ identifiers: Row[] }>;
  save(row: Row): Promise<Row>;
  create(data: Row): Row;
}

export interface InMemoryDbOptions {
  /** Opt in to `save` / `create` / `insert` / `getRepository` (see the file header). */
  writes?: boolean;
  /** Primary-key property per entity (default `id`); new rows get the next integer in it. */
  pk?: Map<EntityClass, string>;
  /** Extra declared reads on the fake `DataSource` (for example `createQueryRunner`). */
  dataSourceReads?: Record<string, any>;
  /** Fault injection: the k-th `update` (1-based, counted across every table) throws. */
  failOnUpdate?: number;
  /** Fault injection: every `save` / `insert` into this table throws. */
  failOnInsertInto?: EntityClass;
}

export interface InMemoryDb {
  tables: Map<EntityClass, Row[]>;
  /** Every `update` issued, in order. */
  updated: Array<{ entity: string; where: Row; set: Row }>;
  /** Every row written by `save` / `insert`, in order. */
  inserted: Array<{ entity: string; row: Row }>;
  world: ClosedWorld;
  /** The fake `DataSource`: `transaction(work)` (+ whatever `dataSourceReads` declared). */
  dataSource: any;
  /** How many times `transaction` was entered. */
  readonly transactions: number;
  rowsOf(entity: EntityClass): Row[];
  /** Is the row with this key (`pk`, default `id`) currently active? */
  isActive(entity: EntityClass, id: number, pk?: string): boolean;
  /** A repository-shaped view over one table (needs `writes: true`). */
  repositoryOf(entity: EntityClass): InMemoryRepository;
}

// Booleans and 0/1 are the same value to MySQL; compare them as such.
const norm = (value: unknown) =>
  typeof value === 'boolean' ? (value ? 1 : 0) : value;

const matches = (row: Row, where: Row): boolean =>
  Object.entries(where).every(([key, expected]) => {
    if (expected instanceof FindOperator) {
      if (expected.type === 'in') {
        return (expected.value as unknown[]).some(
          (candidate) => norm(candidate) === norm(row[key]),
        );
      }
      if (expected.type === 'not') {
        return norm(row[key]) !== norm(expected.value);
      }
      if (expected.type === 'isNull') return row[key] == null;
      throw new Error(`unsupported FindOperator ${expected.type} in the fake`);
    }
    return norm(row[key]) === norm(expected);
  });

/** `seed`: entity class -> rows (`is_active` written as 1 / 0, the way the database holds it). */
export function createInMemoryDb(
  seed: Array<[EntityClass, Row[]]>,
  options: InMemoryDbOptions = {},
): InMemoryDb {
  const tables = new Map<EntityClass, Row[]>(seed);
  const updated: InMemoryDb['updated'] = [];
  const inserted: InMemoryDb['inserted'] = [];
  const world = createClosedWorld();
  let transactions = 0;
  const rowsOf = (entity: EntityClass) => {
    if (!tables.has(entity)) tables.set(entity, []);
    return tables.get(entity);
  };
  const pkOf = (entity: EntityClass) => options.pk?.get(entity) ?? 'id';

  const find = async (
    entity: EntityClass,
    findOptions: {
      where?: Row;
      order?: Record<string, 'ASC' | 'DESC'>;
      take?: number;
    } = {},
  ) => {
    let found = rowsOf(entity).filter((row) =>
      matches(row, findOptions.where ?? {}),
    );
    const order = Object.entries(findOptions.order ?? {});
    if (order.length) {
      found = [...found].sort((a, b) => {
        for (const [key, direction] of order) {
          const diff = Number(norm(a[key]) ?? 0) - Number(norm(b[key]) ?? 0);
          if (diff) return direction === 'DESC' ? -diff : diff;
        }
        return 0;
      });
    }
    if (findOptions.take != null) found = found.slice(0, findOptions.take);
    return found.map((row) => ({ ...row }));
  };
  const update = async (
    entity: EntityClass,
    criteria: Row | number | string,
    set: Row,
  ) => {
    // `repository.update(7, set)`: a bare key means "the row whose primary key is 7".
    const where: Row =
      typeof criteria === 'object' ? criteria : { [pkOf(entity)]: criteria };
    updated.push({ entity: entity.name, where, set });
    if (options.failOnUpdate && updated.length === options.failOnUpdate) {
      throw new Error(`injected fault on update #${options.failOnUpdate}`);
    }
    let affected = 0;
    for (const row of rowsOf(entity)) {
      if (!matches(row, where)) continue;
      Object.assign(row, {
        ...set,
        ...('is_active' in set ? { is_active: norm(set.is_active) } : {}),
      });
      affected++;
    }
    return { affected };
  };
  const insert = async (entity: EntityClass, row: Row) => {
    if (options.failOnInsertInto === entity) {
      throw new Error(`injected fault on insert into ${entity.name}`);
    }
    const table = rowsOf(entity);
    const key = pkOf(entity);
    // `save` of a row that already exists (it carries its key) is an UPDATE of that row.
    const existing =
      row[key] != null ? table.find((r) => r[key] === row[key]) : undefined;
    if (existing) {
      Object.assign(existing, row);
      if ('is_active' in row) existing.is_active = norm(row.is_active);
      return existing;
    }
    const stored: Row = {
      is_active: 1,
      ...row,
      [key]:
        row[key] ?? table.reduce((max, r) => Math.max(max, r[key] ?? 0), 0) + 1,
    };
    stored.is_active = norm(stored.is_active);
    table.push(stored);
    inserted.push({ entity: entity.name, row: { ...stored } });
    return stored;
  };
  const repositoryOf = (entity: EntityClass): InMemoryRepository => ({
    find: (findOptions) => find(entity, findOptions),
    findOne: async (findOptions) =>
      (await find(entity, { ...findOptions, take: 1 }))[0] ?? null,
    update: (where: any, set) => update(entity, where, set),
    insert: async (row) => {
      const stored = await insert(entity, row);
      return { identifiers: [{ [pkOf(entity)]: stored[pkOf(entity)] }] };
    },
    save: (row) => insert(entity, row),
    create: (data) => ({ ...data }),
  });

  const manager = world.fake('manager', {
    find: (entity: EntityClass, findOptions: { where?: Row } = {}) =>
      find(entity, findOptions),
    update,
    ...(options.writes
      ? {
          save: (entity: EntityClass, row: Row) => insert(entity, row),
          create: (_entity: EntityClass, data: Row) => ({ ...data }),
          // Every repository is itself a closed world: `delete`, `remove`, `query`,
          // `createQueryBuilder`, ... are recorded violations (T-5 review, advisory 4).
          getRepository: (entity: EntityClass) =>
            world.fake(`repository<${entity.name}>`, repositoryOf(entity)),
        }
      : {}),
  });
  const dataSource = world.fake('dataSource', {
    ...options.dataSourceReads,
    // A model of ONE database transaction: if the work throws, every row goes back to what it was
    // when the transaction started (RSB-T-5: "CAS + history are atomic" is a claim about this). The
    // `updated` / `inserted` logs are attempt logs and are not rolled back.
    transaction: async (work: (m: unknown) => Promise<unknown>) => {
      transactions++;
      const before = new Map<EntityClass, Row[]>(
        [...tables].map(([entity, rows]) => [
          entity,
          rows.map((row) => ({ ...row })),
        ]),
      );
      try {
        return await work(manager);
      } catch (error) {
        for (const [entity, rows] of tables) {
          rows.length = 0;
          rows.push(...(before.get(entity) ?? []));
        }
        throw error;
      }
    },
  });

  return {
    tables,
    updated,
    inserted,
    world,
    dataSource,
    get transactions() {
      return transactions;
    },
    rowsOf,
    repositoryOf,
    isActive: (entity, id, pk = 'id') =>
      norm(rowsOf(entity).find((row) => row[pk] === id)?.is_active) === 1,
  };
}
