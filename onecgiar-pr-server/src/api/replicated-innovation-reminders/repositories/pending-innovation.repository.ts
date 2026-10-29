// @akili-spec changes/replicated-innovation-reminders
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PendingInnovationRowV2 } from '../digest-builder';

export interface MeliaRow {
  initiative_id: number;
  name: string | null;
  email: string;
}
export interface ActiveUserRow {
  email: string;
  name: string;
}
export interface CenterMelRow {
  center_code: string;
  name: string | null;
  email: string;
}

const IN_CHUNK = 1000;

/**
 * `RIR-T-2` / `RIR-T-11` — read-only SQL behind the reminder digests (design §5, §15).
 *
 * Every statement is parameterised (`?`); no value is ever interpolated. The active Reporting
 * phase is resolved by the CALLER (`RIR-P-6`).
 *
 * Not proven by the unit spec: that the predicates select the right rows on real data (user-run
 * `prdb` counts, tasks.md RIR-T-2 / RIR-T-11).
 */
@Injectable()
export class PendingInnovationRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Pending replicated innovations of one phase, one row per result (`RIR-R-1`), W1/W2 AND W3
   * (the `source <> 'API'` filter was dropped at T-11; `source` is returned instead).
   *
   * - Owner SP = `results_by_inititiative.initiative_role_id = 1` and active (`RIR-P-2`);
   *   `inititiative_id` is the load-bearing DB typo.
   * - Lead mail = LEFT JOIN `ad_users` with `is_active = 1` (`RIR-P-4`).
   * - Developer text (`RIR-P-11`): LEFT JOIN of the active `results_innovations_dev` row with the
   *   highest id (deterministic, one row per result).
   * - Lead center (`RIR-P-14`, RIR-OQ-8 default): active `results_center` with
   *   `is_leading_result = 1`, lowest id if several; name from `clarisa_institutions`.
   */
  async findPending(versionId: number): Promise<PendingInnovationRowV2[]> {
    const rows: any[] = await this.dataSource.query(
      `
      SELECT
        r.id AS result_id,
        r.result_code AS result_code,
        r.title AS title,
        r.result_type_id AS result_type_id,
        r.version_id AS version_id,
        r.source AS source,
        ci.id AS initiative_id,
        ci.official_code AS initiative_code,
        ci.short_name AS initiative_short_name,
        ad.mail AS lead_email,
        ad.display_name AS lead_name,
        r.lead_contact_person AS lead_contact_person,
        rid.innovation_developers AS developer_text,
        lrc.center_id AS lead_center_code,
        lci.name AS lead_center_name
      FROM result r
      INNER JOIN results_by_inititiative rbi
        ON rbi.result_id = r.id
        AND rbi.is_active = 1
        AND rbi.initiative_role_id = 1
      INNER JOIN clarisa_initiatives ci
        ON ci.id = rbi.inititiative_id
      LEFT JOIN ad_users ad ON ad.id = r.lead_contact_person_id AND ad.is_active = 1
      LEFT JOIN results_innovations_dev rid
        ON rid.result_innovation_dev_id = (
          SELECT MAX(d.result_innovation_dev_id)
          FROM results_innovations_dev d
          WHERE d.results_id = r.id AND d.is_active = 1
        )
      LEFT JOIN results_center lrc
        ON lrc.id = (
          SELECT MIN(c.id)
          FROM results_center c
          WHERE c.result_id = r.id AND c.is_leading_result = 1 AND c.is_active = 1
        )
      LEFT JOIN clarisa_center lcc ON lcc.code = lrc.center_id
      LEFT JOIN clarisa_institutions lci ON lci.id = lcc.institutionId
      WHERE r.version_id = ?
        AND r.result_type_id IN (2, 7)
        AND r.is_replicated = 1
        AND r.status_id = 1
        AND r.is_active = 1
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
      source: row.source ?? null,
      developer_text: row.developer_text ?? null,
      lead_center_code: row.lead_center_code ?? null,
      lead_center_name: row.lead_center_name ?? null,
    }));
  }

  /**
   * Active MELIA focal points of the given initiatives (`RIR-R-3`, `RIR-R-13`). Coordinators
   * (`role_by_user`) are NOT included any more (T-11).
   */
  async findMeliaByInitiatives(initiativeIds: number[]): Promise<MeliaRow[]> {
    if (!initiativeIds?.length) return [];
    const rows: any[] = await this.dataSource.query(
      `
      SELECT
        m.initiative_id AS initiative_id,
        m.name AS name,
        m.email AS email
      FROM initiative_melia_focal_point m
      WHERE m.is_active = 1
        AND m.initiative_id IN (?)
      `,
      [initiativeIds],
    );
    return rows
      .map((row) => ({
        initiative_id: Number(row.initiative_id),
        name: row.name ?? null,
        email: typeof row.email === 'string' ? row.email.trim() : '',
      }))
      .filter((row) => row.email);
  }

  /**
   * Which of the given addresses have an active PRMS account (`RIR-R-17`, `RIR-P-13`).
   * Case-insensitive; returns the lower-cased email and the account name.
   */
  async findActiveUserEmails(emails: string[]): Promise<ActiveUserRow[]> {
    const unique = [
      ...new Set(
        (emails ?? [])
          .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
          .filter(Boolean),
      ),
    ];
    if (!unique.length) return [];

    const found = new Map<string, ActiveUserRow>();
    for (let i = 0; i < unique.length; i += IN_CHUNK) {
      const rows: any[] = await this.dataSource.query(
        `
        SELECT
          LOWER(u.email) AS email,
          TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name
        FROM users u
        WHERE LOWER(u.email) IN (?)
          AND u.active = 1
        `,
        [unique.slice(i, i + IN_CHUNK)],
      );
      for (const row of rows) {
        const email = String(row.email ?? '').toLowerCase();
        if (email && !found.has(email)) {
          found.set(email, { email, name: row.name ?? '' });
        }
      }
    }
    return [...found.values()];
  }

  /** Active MEL focal points of the given centers (`RIR-R-18`, `RIR-DD-9`). */
  async findCenterMel(centerCodes: string[]): Promise<CenterMelRow[]> {
    if (!centerCodes?.length) return [];
    const rows: any[] = await this.dataSource.query(
      `
      SELECT
        c.center_code AS center_code,
        c.name AS name,
        c.email AS email
      FROM center_mel_focal_point c
      WHERE c.is_active = 1
        AND c.center_code IN (?)
      `,
      [centerCodes],
    );
    return rows
      .map((row) => ({
        center_code: String(row.center_code),
        name: row.name ?? null,
        email: typeof row.email === 'string' ? row.email.trim() : '',
      }))
      .filter((row) => row.email);
  }
}
