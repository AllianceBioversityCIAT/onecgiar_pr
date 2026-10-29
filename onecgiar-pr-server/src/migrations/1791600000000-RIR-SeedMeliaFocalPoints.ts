// @akili-spec changes/replicated-innovation-reminders
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * INC-165323 `RIR-T-7` — seed of the MELIA focal points per Science Program / Accelerator
 * (`design.md` §3.1 `initiative_melia_focal_point`, §3.2; `requirements.md` RIR-R-13).
 *
 * The list is the DEP-1 data provided by the user on 2026-10-19: 16 (initiative, person) pairs over
 * 13 distinct initiatives (SP01 to SP13). Emails are stored trimmed and lower-cased.
 *
 * ## No hard-coded ids
 *
 * Each row is resolved by `clarisa_initiatives.official_code` (active rows only), so no
 * `initiative_id` is typed here. Genebanks is `SP13` (2025-2030 portfolio); the old-portfolio
 * `INIT-xx` codes are deliberately not used.
 *
 * ## Fail loudly
 *
 * `up` first counts the active initiatives matching the 13 codes. If any code is missing, or
 * matches more than one row, it throws naming the codes (never the emails) BEFORE inserting
 * anything, so a CLARISA drift cannot leave a half-seeded list.
 *
 * ## The four futures (repo rule 25)
 *
 *   - Applied without the new code: rows nobody reads. Inert.
 *   - Code deployed without applying it: not a normal path (Jenkins applies migrations first).
 *   - Applied twice: every INSERT is `WHERE NOT EXISTS` on (`initiative_id`, `email`), which is the
 *     table's UNIQUE key. A pair already present (for example added by hand) is left untouched.
 *   - Reverted: `down` deletes exactly these 16 pairs, matched through `official_code` and `email`.
 *     Any other focal point row stays.
 */
export class RIRSeedMeliaFocalPoints1791600000000
  implements MigrationInterface
{
  name = 'RIRSeedMeliaFocalPoints1791600000000';

  /** official_code, name ("Last, First"), email (already trimmed and lower-case). */
  private static readonly FOCAL_POINTS: ReadonlyArray<
    readonly [string, string, string]
  > = [
    ['SP01', 'Mawia, Ruth Musengyá', 'r.mawia@cgiar.org'],
    ['SP13', 'Jeitani, Asma', 'a.jeitani@cgiar.org'],
    ['SP02', 'Ampadu-Boakye, Theresa', 't.ampadu-boakye@cgiar.org'],
    ['SP03', 'Baltenweck, Isabelle', 'i.baltenweck@cgiar.org'],
    ['SP04', 'Blundo, Genowefa', 'genowefa.blundo@cgiar.org'],
    ['SP05', 'Bonaiuti, Enrico', 'e.bonaiuti@cgiar.org'],
    ['SP06', 'Dela Rueda, Justin', 'j.delarueda@cgiar.org'],
    ['SP06', 'Pede, Valerien', 'v.pede@cgiar.org'],
    ['SP07', 'Nirmal, Rajalakshmi', 'r.nirmal@cgiar.org'],
    ['SP08', 'Kibet, Walter', 'w.kibet@cgiar.org'],
    ['SP09', 'Dela Rueda, Justin', 'j.delarueda@cgiar.org'],
    ['SP09', 'Pede, Valerien', 'v.pede@cgiar.org'],
    ['SP10', 'Lopez Avila, Diana', 'd.avila@cgiar.org'],
    ['SP10', 'Markicevic, Isidora', 'i.markicevic@cgiar.org'],
    ['SP11', 'Barlis, Angelica', 'a.barlis@cgiar.org'],
    ['SP12', 'Benavente, Grecia', 'g.benavente@cgiar.org'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const { FOCAL_POINTS } = RIRSeedMeliaFocalPoints1791600000000;
    const codes = [...new Set(FOCAL_POINTS.map(([code]) => code))];

    const found: Array<{ official_code: string; n: number | string }> =
      await queryRunner.query(
        `
        SELECT official_code, COUNT(*) AS n
        FROM \`clarisa_initiatives\`
        WHERE active = 1 AND official_code IN (${codes.map(() => '?').join(', ')})
        GROUP BY official_code;
        `,
        codes,
      );

    const matches = new Map<string, number>(
      (found ?? []).map((row) => [row.official_code, Number(row.n)]),
    );
    const missing = codes.filter((code) => matches.get(code) !== 1);
    if (missing.length > 0) {
      throw new Error(
        `RIR-SeedMeliaFocalPoints: expected exactly one active clarisa_initiatives row for each official_code, but these codes did not match exactly one: ${missing.join(', ')}. Nothing was inserted.`,
      );
    }

    for (const [code, name, email] of FOCAL_POINTS) {
      await queryRunner.query(
        `
        INSERT INTO \`initiative_melia_focal_point\` (initiative_id, name, email)
        SELECT ci.id, ?, ?
        FROM \`clarisa_initiatives\` ci
        WHERE ci.official_code = ?
          AND ci.active = 1
          AND NOT EXISTS (
            SELECT 1 FROM \`initiative_melia_focal_point\` m
            WHERE m.initiative_id = ci.id AND m.email = ?
          );
        `,
        [name, email, code, email],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [
      code,
      ,
      email,
    ] of RIRSeedMeliaFocalPoints1791600000000.FOCAL_POINTS) {
      await queryRunner.query(
        `
        DELETE m FROM \`initiative_melia_focal_point\` m
        JOIN \`clarisa_initiatives\` ci ON ci.id = m.initiative_id
        WHERE ci.official_code = ? AND m.email = ?;
        `,
        [code, email],
      );
    }
  }
}
