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

    // RBX-R-6 (one statement) + DD-1: the bound version feeds branch A and the IPSR year join (twice)
    it('issues exactly one statement, with the version bound twice and never interpolated', async () => {
      const { dataSource, sql } = await run();
      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(dataSource.query.mock.calls[0][1]).toEqual([
        VERSION_ID,
        VERSION_ID,
      ]);
      expect(sql).not.toContain(String(VERSION_ID));
    });

    it('is a read-only SELECT', async () => {
      const { sql } = await run();
      expect(sql).toMatch(/^SELECT /);
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i);
    });

    // RIR-R-1 / RBX-R-2 negative: branch A is exactly today's rule, the bound phase with types 2 and 7
    it('branch A keeps the bound phase together with Innovation Development (7) and Innovation Use (2)', async () => {
      const { sql } = await run();
      expect(sql).toContain(
        '(r.version_id = ? AND r.result_type_id IN (2, 7))',
      );
    });

    // RBX-R-2: packages (type 10) come only from an open IPSR phase of the same year
    describe('branch B: innovation packages (RBX-R-2, DD-8)', () => {
      it('selects type 10 rows', async () => {
        const { sql } = await run();
        expect(sql).toContain('r.result_type_id = 10');
      });

      it('takes the version from IPSR phases only: app_module_id = 2', async () => {
        const { sql } = await run();
        expect(sql).toContain('app_module_id = 2');
      });

      it('requires the IPSR phase to be open: status = 1 (DD-8)', async () => {
        const { sql } = await run();
        expect(sql).toMatch(/\w+\.status = 1/);
        expect(sql).toMatch(/\w+\.is_active = 1 AND \w+\.status = 1/);
      });

      it('requires the IPSR phase to be active: is_active = 1 on the version alias', async () => {
        const { sql } = await run();
        expect(sql).toMatch(/\w+\.app_module_id = 2 AND \w+\.is_active = 1/);
      });

      it('pins the IPSR phase_year to the bound version phase_year', async () => {
        const { sql } = await run();
        const m = sql.match(/(\w+)\.phase_year = (\w+)\.phase_year/);
        expect(m).not.toBeNull();
        const [, ipsr, bound] = m as RegExpMatchArray;
        expect(ipsr).not.toBe(bound);
        // the bound alias is the version row selected by the second bound parameter
        expect(sql).toContain(`INNER JOIN version ${bound} ON ${bound}.id = ?`);
        expect(sql).toContain(`FROM version ${ipsr}`);
      });

      it('does not filter packages by the bound version id (the Reporting version holds no packages)', async () => {
        const { sql } = await run();
        const branchB = sql.slice(sql.indexOf('r.result_type_id = 10'));
        expect(
          branchB.slice(0, branchB.indexOf('r.is_replicated')),
        ).not.toContain('r.version_id = ?');
      });
    });

    // RBX-R-1: listed results disappear; key is result_code (not id); an inactive entry does not exclude
    describe('exclusion list (RBX-R-1, DD-2)', () => {
      it('uses NOT EXISTS against replicated_innovation_reminder_exclusion', async () => {
        const { sql } = await run();
        expect(sql).toContain('NOT EXISTS');
        expect(sql).toContain(
          'FROM replicated_innovation_reminder_exclusion x',
        );
      });

      it('keys the exclusion on result_code, not on the result id', async () => {
        const { sql } = await run();
        expect(sql).toContain('x.result_code = r.result_code');
        expect(sql).not.toMatch(/x\.result_code = r\.id/);
      });

      it('only active entries exclude: x.is_active = 1', async () => {
        const { sql } = await run();
        expect(sql).toContain('x.is_active = 1');
      });

      it('applies to every branch: the NOT EXISTS sits outside the A/B OR group', async () => {
        const { sql } = await run();
        expect(sql.indexOf('NOT EXISTS')).toBeGreaterThan(
          sql.indexOf('r.is_active = 1'),
        );
      });
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

    // T-11: W3 (bilateral, source 'API') results are now INCLUDED
    it("no longer excludes bilateral-sourced results (no source <> 'API')", async () => {
      const { sql } = await run();
      expect(sql).not.toContain("<> 'API'");
      expect(sql).not.toMatch(/r\.source\s*(<>|!=|=|IS)/);
    });

    it('returns source, developer text and lead center columns', async () => {
      const { sql } = await run();
      expect(sql).toContain('r.source AS source');
      expect(sql).toContain('rid.innovation_developers AS developer_text');
      expect(sql).toContain('lrc.center_id AS lead_center_code');
      expect(sql).toContain('lci.name AS lead_center_name');
    });

    it('LEFT JOINs the active developer row deterministically (max id, one row per result)', async () => {
      const { sql } = await run();
      expect(sql).toContain('LEFT JOIN results_innovations_dev rid');
      expect(sql).toContain('SELECT MAX(d.result_innovation_dev_id)');
      expect(sql).toContain('d.results_id = r.id AND d.is_active = 1');
    });

    // RIR-P-14 / RIR-OQ-8
    it('LEFT JOINs the single active leading center: is_leading_result = 1, is_active = 1, MIN(id)', async () => {
      const { sql } = await run();
      expect(sql).toContain('LEFT JOIN results_center lrc');
      expect(sql).toContain('SELECT MIN(c.id)');
      expect(sql).toContain(
        'c.result_id = r.id AND c.is_leading_result = 1 AND c.is_active = 1',
      );
      expect(sql).toContain(
        'LEFT JOIN clarisa_center lcc ON lcc.code = lrc.center_id',
      );
      expect(sql).not.toMatch(
        /INNER JOIN (results_center|results_innovations_dev)/,
      );
    });

    it('does not touch role_by_user', async () => {
      const { sql } = await run();
      expect(sql).not.toContain('role_by_user');
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
          source: 'Result',
          developer_text: '1. Ann <ann@cgiar.org>',
          lead_center_code: 'CENTER-1',
          lead_center_name: 'Center One',
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
          source: 'API',
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
          source: 'Result',
          developer_text: '1. Ann <ann@cgiar.org>',
          lead_center_code: 'CENTER-1',
          lead_center_name: 'Center One',
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
          source: 'API',
          developer_text: null,
          lead_center_code: null,
          lead_center_name: null,
        },
      ]);
    });

    it('returns an empty list when nothing is pending', async () => {
      const { result } = await run([]);
      expect(result).toEqual([]);
    });
  });

  describe('findMeliaByInitiatives', () => {
    const IDS = [901, 902];

    async function run(rows: any[] = [], ids: number[] = IDS) {
      const { repository, dataSource } = makeRepository(rows);
      const result = await repository.findMeliaByInitiatives(ids);
      return {
        result,
        dataSource,
        sql: dataSource.query.mock.calls[0] ? sqlOf(dataSource.query) : '',
      };
    }

    it('returns [] without querying when there are no initiatives', async () => {
      const { repository, dataSource } = makeRepository();
      expect(await repository.findMeliaByInitiatives([])).toEqual([]);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('is a single MELIA-only statement with ids bound, never interpolated', async () => {
      const { dataSource, sql } = await run();
      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(dataSource.query.mock.calls[0][1]).toEqual([IDS]);
      expect(sql).toMatch(/^SELECT /);
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i);
      expect(sql).not.toContain('901');
      expect(sql).not.toContain('role_by_user');
      expect(sql).not.toContain('UNION');
    });

    // RIR-R-13: "Inactive entries MUST NOT be copied"
    it('reads initiative_melia_focal_point with is_active = 1, scoped to the initiatives', async () => {
      const { sql } = await run();
      expect(sql).toContain('FROM initiative_melia_focal_point m');
      expect(sql).toContain('m.is_active = 1');
      expect(sql).toContain('m.initiative_id IN (?)');
    });

    it('maps rows and drops empty addresses', async () => {
      const { result } = await run([
        { initiative_id: '901', name: 'Mel', email: ' melia1@cgiar.org ' },
        { initiative_id: 902, name: null, email: '  ' },
      ]);
      expect(result).toEqual([
        { initiative_id: 901, name: 'Mel', email: 'melia1@cgiar.org' },
      ]);
    });
  });

  describe('findActiveUserEmails', () => {
    it('returns [] without querying on empty / blank input', async () => {
      const { repository, dataSource } = makeRepository();
      expect(await repository.findActiveUserEmails([])).toEqual([]);
      expect(await repository.findActiveUserEmails(['  ', ''])).toEqual([]);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('issues one parameterised query: LOWER(u.email) IN (?) AND u.active = 1', async () => {
      const { repository, dataSource } = makeRepository([
        { email: 'ann@cgiar.org', name: 'Ann Lee' },
      ]);
      const result = await repository.findActiveUserEmails([
        'Ann@CGIAR.org',
        'ann@cgiar.org',
        'bob@cgiar.org',
      ]);
      const sql = sqlOf(dataSource.query);
      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(sql).toContain('LOWER(u.email) IN (?)');
      expect(sql).toContain('u.active = 1');
      expect(sql).toContain('FROM users u');
      expect(sql).not.toContain('role_by_user');
      expect(sql).not.toContain('bob@cgiar.org');
      expect(dataSource.query.mock.calls[0][1]).toEqual([
        ['ann@cgiar.org', 'bob@cgiar.org'],
      ]);
      expect(result).toEqual([{ email: 'ann@cgiar.org', name: 'Ann Lee' }]);
    });

    it('chunks inputs larger than 1000 addresses', async () => {
      const emails = Array.from({ length: 2500 }, (_, i) => `u${i}@cgiar.org`);
      const { repository, dataSource } = makeRepository([]);
      await repository.findActiveUserEmails(emails);
      expect(dataSource.query).toHaveBeenCalledTimes(3);
      expect(dataSource.query.mock.calls[0][1][0]).toHaveLength(1000);
      expect(dataSource.query.mock.calls[2][1][0]).toHaveLength(500);
    });
  });

  describe('findCenterMel', () => {
    it('returns [] without querying when there are no centers', async () => {
      const { repository, dataSource } = makeRepository();
      expect(await repository.findCenterMel([])).toEqual([]);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('reads active center_mel_focal_point rows with the codes bound', async () => {
      const { repository, dataSource } = makeRepository([
        { center_code: 'CENTER-1', name: 'Mel C', email: ' mel@cgiar.org ' },
        { center_code: 'CENTER-2', name: null, email: '' },
      ]);
      const result = await repository.findCenterMel(['CENTER-1', 'CENTER-2']);
      const sql = sqlOf(dataSource.query);
      expect(sql).toContain('FROM center_mel_focal_point c');
      expect(sql).toContain('c.is_active = 1');
      expect(sql).toContain('c.center_code IN (?)');
      expect(sql).not.toContain('CENTER-1');
      expect(dataSource.query.mock.calls[0][1]).toEqual([
        ['CENTER-1', 'CENTER-2'],
      ]);
      expect(result).toEqual([
        { center_code: 'CENTER-1', name: 'Mel C', email: 'mel@cgiar.org' },
      ]);
    });
  });
  // @akili-spec changes/rir-center-focal-routing
  describe('findOptedInCenters (RCF-T-2)', () => {
    it('reads active center_reminder_routing rows with route_all_to_center = 1 and returns the codes', async () => {
      const { repository, dataSource } = makeRepository([
        { center_code: 'CENTER-1' },
        { center_code: ' CENTER-2 ' },
        { center_code: '' },
      ]);
      const result = await repository.findOptedInCenters();
      const sql = sqlOf(dataSource.query);
      expect(sql).toContain('FROM center_reminder_routing r');
      expect(sql).toContain('r.route_all_to_center = 1');
      expect(sql).toContain('r.is_active = 1');
      expect(result).toEqual(['CENTER-1', 'CENTER-2']);
    });
  });
});
