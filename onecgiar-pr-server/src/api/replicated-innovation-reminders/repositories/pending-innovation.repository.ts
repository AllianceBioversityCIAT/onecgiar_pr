// @akili-spec changes/replicated-innovation-reminders
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CcByInitiative, PendingRow } from '../digest-builder';

/**
 * `RIR-T-2` — read-only SQL behind the reminder digests (design §5, `RIR-R-1`, `RIR-R-3`,
 * `RIR-R-4`, `RIR-R-13`).
 *
 * Two statements, one per method, both parameterised (`?`); no value is ever interpolated.
 * The active Reporting phase is resolved by the CALLER (`RIR-P-6`): this repository takes the
 * `versionId` it is given and never looks a phase up itself.
 *
 * Not proven by the unit spec (it only asserts the predicates are present): that they select the
 * right rows on real data. That is the user-run `prdb` count (tasks.md RIR-T-2, premises P-8/P-9).
 */
@Injectable()
export class PendingInnovationRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Pending replicated innovations of one phase, one row per result (`RIR-R-1`).
   *
   * - Owner SP = `results_by_inititiative.initiative_role_id = 1` and active (`RIR-P-2`,
   *   `bilateral.service.ts:1051`); `inititiative_id` is the load-bearing DB typo.
   * - Lead mail = LEFT JOIN `ad_users` on `lead_contact_person_id` with `is_active = 1`
   *   (`RIR-P-4`, `submissions.service.ts:591`), so a result with no AD user still comes back with
   *   `lead_email` NULL and its free-text `lead_contact_person` (`RIR-R-4`, data side).
   * - `source` is a nullable enum: `NULL <> 'API'` is NULL in SQL, so the bilateral exclusion is
   *   written `(source IS NULL OR source <> 'API')` to keep rows whose source was never stamped.
   */
  async findPending(versionId: number): Promise<PendingRow[]> {
    const rows: any[] = await this.dataSource.query(
      `
      SELECT
        r.id AS result_id,
        r.result_code AS result_code,
        r.title AS title,
        r.result_type_id AS result_type_id,
        r.version_id AS version_id,
        ci.id AS initiative_id,
        ci.official_code AS initiative_code,
        ci.short_name AS initiative_short_name,
        ad.mail AS lead_email,
        ad.display_name AS lead_name,
        r.lead_contact_person AS lead_contact_person
      FROM result r
      INNER JOIN results_by_inititiative rbi
        ON rbi.result_id = r.id
        AND rbi.is_active = 1
        AND rbi.initiative_role_id = 1
      INNER JOIN clarisa_initiatives ci
        ON ci.id = rbi.inititiative_id
      LEFT JOIN ad_users ad ON ad.id = r.lead_contact_person_id AND ad.is_active = 1
      WHERE r.version_id = ?
        AND r.result_type_id IN (2, 7)
        AND r.is_replicated = 1
        AND r.status_id = 1
        AND r.is_active = 1
        AND (r.source IS NULL OR r.source <> 'API')
      ORDER BY ci.official_code ASC, r.result_code ASC, r.id ASC
      `,
      [versionId],
    );

    return rows.map((row) => ({
      result_id: Number(row.result_id),
      result_code: Number(row.result_code),
      title: row.title,
      result_type_id: Number(row.result_type_id),
      version_id: Number(row.version_id),
      initiative_id: Number(row.initiative_id),
      initiative_code: row.initiative_code,
      initiative_short_name: row.initiative_short_name ?? null,
      lead_email: row.lead_email ?? null,
      lead_name: row.lead_name ?? null,
      lead_contact_person: row.lead_contact_person ?? null,
    }));
  }

  /**
   * CC addresses per initiative (`RIR-R-3`, `RIR-R-13`): the UNION of
   * - coordinators: `role_by_user.role = 5` ONLY (`RIR-P-3`) — never lead, co-lead, director or
   *   any other role — active assignment and active user; and
   * - MELIA focal points: `initiative_melia_focal_point.is_active = 1`.
   *
   * `users.email` and the new MELIA table's `email` may carry different collations, which makes a
   * plain UNION fail ("Illegal mix of collations"); both branches are therefore normalised with the
   * `CONVERT(... USING utf8mb4) COLLATE utf8mb4_unicode_ci` idiom already used in `result.repository.ts`.
   * The ids are bound once per branch (`[ids, ids]`).
   */
  async findCcByInitiatives(initiativeIds: number[]): Promise<CcByInitiative> {
    const byInitiative: CcByInitiative = new Map();
    if (!initiativeIds?.length) return byInitiative;

    const rows: any[] = await this.dataSource.query(
      `
      SELECT
        rbu.initiative_id AS initiative_id,
        CONVERT(u.email USING utf8mb4) COLLATE utf8mb4_unicode_ci AS email
      FROM role_by_user rbu
      INNER JOIN users u ON u.id = rbu.user AND u.active = 1
      WHERE rbu.role = 5
        AND rbu.active = 1
        AND rbu.initiative_id IN (?)
      UNION
      SELECT
        m.initiative_id AS initiative_id,
        CONVERT(m.email USING utf8mb4) COLLATE utf8mb4_unicode_ci AS email
      FROM initiative_melia_focal_point m
      WHERE m.is_active = 1
        AND m.initiative_id IN (?)
      `,
      [initiativeIds, initiativeIds],
    );

    for (const row of rows) {
      const email = typeof row.email === 'string' ? row.email.trim() : '';
      if (!email) continue;
      const initiativeId = Number(row.initiative_id);
      const list = byInitiative.get(initiativeId);
      if (list) list.push(email);
      else byInitiative.set(initiativeId, [email]);
    }
    return byInitiative;
  }
}
