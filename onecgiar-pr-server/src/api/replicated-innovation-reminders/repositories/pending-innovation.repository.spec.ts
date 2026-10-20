// @akili-spec changes/replicated-innovation-reminders
import { PendingInnovationRepository } from './pending-innovation.repository';

/**
 * `RIR-T-2` — the repository is raw SQL, so the SQL text and its bound params ARE the seam
 * (design §5). Each RIR-R-1 / RIR-R-3 / RIR-R-13 predicate has its own assertion: removing any
 * single predicate from the query turns exactly that test red. Whether the predicates select the
 * right rows on real data is NOT proven here; that is the user-run `prdb` check (tasks.md RIR-T-2).
 */
describe('PendingInnovationRepository', () => {
  const sqlOf = (query: jest.Mock): string =>
    String(query.mock.calls[0][0]).replace(/\s+/g, ' ').trim();

  function makeRepository(rows: any[] = []) {
    const dataSource = { query: jest.fn().mockResolvedValue(rows) };
    const repository = new PendingInnovationRepository(dataSource as any);
    return { repository, dataSource };
  }

  describe('findPending', () => {
    const VERSION_ID = 4242;

    async function run(rows: any[] = []) {
      const { repository, dataSource } = makeRepository(rows);
      const result = await repository.findPending(VERSION_ID);
      return { result, dataSource, sql: sqlOf(dataSource.query) };
    }

    it('issues exactly one statement, with the version bound and never interpolated', async () => {
      const { dataSource, sql } = await run();
      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(dataSource.query.mock.calls[0][1]).toEqual([VERSION_ID]);
      expect(sql).not.toContain(String(VERSION_ID));
    });

    it('is a read-only SELECT', async () => {
      const { sql } = await run();
      expect(sql).toMatch(/^SELECT /);
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i);
    });

    // RIR-R-1: "MUST NOT include results from any phase other than the active Reporting phase"
    it('filters by the bound phase: r.version_id = ?', async () => {
      const { sql } = await run();
      expect(sql).toContain('r.version_id = ?');
    });

    // RIR-R-1 scenario: E (type 1) excluded; only 7 and 2
    it('restricts to Innovation Development (7) and Innovation Use (2)', async () => {
      const { sql } = await run();
      expect(sql).toContain('r.result_type_id IN (2, 7)');
    });

    // RIR-R-1 scenario: D (not replicated) excluded
    it('requires r.is_replicated = 1', async () => {
      const { sql } = await run();
      expect(sql).toContain('r.is_replicated = 1');
    });

    // RIR-R-1 scenario: C (Submitted) excluded
    it('requires status Editing: r.status_id = 1', async () => {
      const { sql } = await run();
      expect(sql).toContain('r.status_id = 1');
    });

    // RIR-R-1 scenario: F (inactive) excluded
    it('requires an active result: r.is_active = 1', async () => {
      const { sql } = await run();
      expect(sql).toContain('r.is_active = 1');
    });

    // RIR-R-1 / RIR-OQ-3: bilateral-sourced excluded (SourceEnum.Bilateral = 'API')
    it("excludes bilateral-sourced results: r.source <> 'API'", async () => {
      const { sql } = await run();
      expect(sql).toContain("r.source <> 'API'");
    });

    it("keeps results whose nullable `source` is NULL (NULL <> 'API' is NULL, not true)", async () => {
      const { sql } = await run();
      expect(sql).toContain("(r.source IS NULL OR r.source <> 'API')");
    });

    // RIR-P-2: owner SP = initiative_role_id = 1, active (bilateral.service.ts:1051)
    it('joins the owner SP only: initiative_role_id = 1 and an active row', async () => {
      const { sql } = await run();
      expect(sql).toContain('rbi.initiative_role_id = 1');
      expect(sql).toContain('rbi.is_active = 1');
      expect(sql).toContain('rbi.result_id = r.id');
    });

    it('does not accept any other initiative role', async () => {
      const { sql } = await run();
      const roles = [...sql.matchAll(/initiative_role_id\s*(=|IN)\s*[^ ]+/g)];
      expect(roles.map((m) => m[0])).toEqual(['initiative_role_id = 1']);
    });

    // RIR-R-4 data side + RIR-P-4: lead mail via ad_users, active AD user, LEFT so no-AD rows survive
    it('LEFT JOINs ad_users on lead_contact_person_id with is_active = 1 (rows without an AD user still return)', async () => {
      const { sql } = await run();
      expect(sql).toContain(
        'LEFT JOIN ad_users ad ON ad.id = r.lead_contact_person_id AND ad.is_active = 1',
      );
      expect(sql).not.toMatch(/INNER JOIN ad_users/);
    });

    it('maps rows to PendingRow, keeping the free-text contact when there is no AD user (RIR-R-4)', async () => {
      const { result } = await run([
        {
          result_id: '10',
          result_code: '555',
          title: 'Maize seed kit',
          result_type_id: 7,
          version_id: 4242,
          initiative_id: 3,
          initiative_code: 'SP01',
          initiative_short_name: 'Breeding',
          lead_email: 'lead@cgiar.org',
          lead_name: 'Lea Der',
          lead_contact_person: 'Lea Der (free text)',
        },
        {
          result_id: 11,
          result_code: 556,
          title: 'No AD user',
          result_type_id: 2,
          version_id: 4242,
          initiative_id: 4,
          initiative_code: 'SP04',
          initiative_short_name: null,
          lead_email: null,
          lead_name: null,
          lead_contact_person: 'Hank Free',
        },
      ]);

      expect(result).toEqual([
        {
          result_id: 10,
          result_code: 555,
          title: 'Maize seed kit',
          result_type_id: 7,
          version_id: 4242,
          initiative_id: 3,
          initiative_code: 'SP01',
          initiative_short_name: 'Breeding',
          lead_email: 'lead@cgiar.org',
          lead_name: 'Lea Der',
          lead_contact_person: 'Lea Der (free text)',
        },
        {
          result_id: 11,
          result_code: 556,
          title: 'No AD user',
          result_type_id: 2,
          version_id: 4242,
          initiative_id: 4,
          initiative_code: 'SP04',
          initiative_short_name: null,
          lead_email: null,
          lead_name: null,
          lead_contact_person: 'Hank Free',
        },
      ]);
    });

    it('returns an empty list when nothing is pending', async () => {
      const { result } = await run([]);
      expect(result).toEqual([]);
    });
  });

  describe('findCcByInitiatives', () => {
    const IDS = [901, 902];

    async function run(rows: any[] = [], ids: number[] = IDS) {
      const { repository, dataSource } = makeRepository(rows);
      const result = await repository.findCcByInitiatives(ids);
      return { result, dataSource, sql: sqlOf(dataSource.query) };
    }

    it('returns an empty map without querying when there are no initiatives', async () => {
      const { repository, dataSource } = makeRepository();
      const result = await repository.findCcByInitiatives([]);
      expect(result).toEqual(new Map());
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('issues exactly one statement with the ids bound for each branch, never interpolated', async () => {
      const { dataSource, sql } = await run();
      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(dataSource.query.mock.calls[0][1]).toEqual([IDS, IDS]);
      expect(sql).not.toContain('901');
      expect(sql).not.toContain('902');
    });

    it('is a read-only UNION of coordinators and MELIA', async () => {
      const { sql } = await run();
      expect(sql).toMatch(/^SELECT /);
      expect(sql).toContain(' UNION ');
      expect(sql).not.toContain('UNION ALL');
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i);
    });

    // RIR-P-3 / RIR-R-3: coordinators = role 5
    it('selects coordinators as rbu.role = 5', async () => {
      const { sql } = await run();
      expect(sql).toContain('rbu.role = 5');
    });

    // RIR-R-3: "MUST NOT include SP leads, co-leads, directors" -> no other role id anywhere
    it('never selects another role (lead / co-lead / director / member)', async () => {
      const { sql } = await run();
      const roles = [...sql.matchAll(/\brole\s*(=|IN|<=|<|>=|>|<>)\s*[^ ]+/g)];
      expect(roles.map((m) => m[0])).toEqual(['role = 5']);
    });

    it('requires an active role assignment and an active user for coordinators', async () => {
      const { sql } = await run();
      expect(sql).toContain('rbu.active = 1');
      expect(sql).toContain('u.active = 1');
      expect(sql).toContain('JOIN users u ON u.id = rbu.user');
    });

    it('scopes coordinators to the given initiatives', async () => {
      const { sql } = await run();
      expect(sql).toContain('rbu.initiative_id IN (?)');
    });

    // RIR-R-13: "Inactive entries MUST NOT be copied"
    it('reads MELIA focal points from initiative_melia_focal_point with is_active = 1', async () => {
      const { sql } = await run();
      expect(sql).toContain('FROM initiative_melia_focal_point m');
      expect(sql).toContain('m.is_active = 1');
      expect(sql).toContain('m.initiative_id IN (?)');
    });

    it('aligns the email collation of both UNION branches (users vs the new MELIA table)', async () => {
      const { sql } = await run();
      const aligned =
        sql.match(
          /CONVERT\([a-z]+\.email USING utf8mb4\) COLLATE utf8mb4_unicode_ci/g,
        ) ?? [];
      expect(aligned).toHaveLength(2);
    });

    it('builds the initiative -> addresses map, skipping empty addresses', async () => {
      const { result } = await run([
        { initiative_id: '901', email: 'coord1@cgiar.org' },
        { initiative_id: 901, email: 'melia1@cgiar.org' },
        { initiative_id: 902, email: 'coord2@cgiar.org' },
        { initiative_id: 902, email: null },
        { initiative_id: 902, email: '  ' },
      ]);

      expect(result).toEqual(
        new Map<number, string[]>([
          [901, ['coord1@cgiar.org', 'melia1@cgiar.org']],
          [902, ['coord2@cgiar.org']],
        ]),
      );
    });

    it('omits initiatives with no addresses from the map', async () => {
      const { result } = await run([]);
      expect(result.size).toBe(0);
    });
  });
});
