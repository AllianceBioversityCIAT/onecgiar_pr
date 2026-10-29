// @akili-spec changes/replicated-innovation-reminders
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * INC-165323 `RIR-T-15` — seed of the Center MEL focal points (`design.md` §15.3,
 * `requirements.md` RIR-R-18 / DEP-5). Table `center_mel_focal_point` is created by
 * `1791700000000-RIR-RecipientModelV2`.
 *
 * ## Source of the list
 *
 * Nicoleta's 5 Feb 2026 deck, cross-checked with the MELIAF Center stocktake (Apr-Sep 2026),
 * confirmed by the user on 2026-10-23. 17 (center, person) rows over 13 center codes (the two
 * Alliance focal points are seeded on BOTH Alliance centers, because W3 results can have either
 * as lead); emails are stored lower-cased. This list MUST be refreshed before each campaign
 * (RIR-R-18).
 *
 * ## No hard-coded center codes
 *
 * `center_code` is resolved at run time from `clarisa_center` joined to `clarisa_institutions`.
 * Per center there is an ordered list of candidates: exact acronym matches first (case-insensitive,
 * trimmed), then institution-name patterns. The first candidate that matches at least one center
 * wins, and ties inside that candidate are broken deterministically (active first, then the
 * lowest `code`). The Alliance is split in CLARISA into two centers, handled as two labels
 * ("Alliance-Bioversity", "Alliance-CIAT"), each resolving to exactly one center.
 *
 * ## Fail loudly
 *
 * After resolving all 13 labels and BEFORE inserting anything, `up` throws if any label is
 * unresolved or if the two Alliance labels resolve to the same code (message names the labels,
 * never the emails), so a CLARISA drift cannot leave a half-seeded list. The Alliance labels use
 * only specific candidates (`Bioversity (Alliance)` / `Bioversity`, and `CIAT (Alliance)` / `CIAT`
 * / the CIAT name), never generic ones like `ABC` or `%Bioversity%` that match both centers.
 *
 * ## The four futures (repo rule 25)
 *
 *   - Applied without the new code: rows nobody reads. Inert.
 *   - Code deployed without applying it: not a normal path (Jenkins applies migrations first).
 *   - Applied twice: each INSERT is `WHERE NOT EXISTS` on (`center_code`, `email`), the table's
 *     UNIQUE key. A pair already present is left untouched.
 *   - Reverted: `down` deletes by the seeded emails only (no re-resolution, so it works even if
 *     CLARISA drifted); the emails belong to this seed and the list is refreshed per campaign.
 */

interface CenterMatcher {
  /** Exact acronym candidates, in priority order. */
  acronyms: readonly string[];
  /** Institution-name LIKE patterns, tried after the acronyms. */
  namePatterns: readonly string[];
}

const CENTER_MATCHERS: Readonly<Record<string, CenterMatcher>> = {
  'Alliance-Bioversity': {
    acronyms: ['Bioversity (Alliance)', 'Bioversity'],
    namePatterns: [],
  },
  'Alliance-CIAT': {
    acronyms: ['CIAT (Alliance)', 'CIAT'],
    namePatterns: ['%International Center for Tropical Agriculture%'],
  },
  AfricaRice: {
    acronyms: ['AfricaRice', 'Africa Rice', 'WARDA'],
    namePatterns: ['%Africa Rice%', '%AfricaRice%'],
  },
  CIMMYT: {
    acronyms: ['CIMMYT'],
    namePatterns: ['%Maize and Wheat%'],
  },
  CIP: {
    acronyms: ['CIP'],
    namePatterns: ['%International Potato Center%'],
  },
  ICARDA: {
    acronyms: ['ICARDA'],
    namePatterns: ['%Agricultural Research in the Dry Areas%'],
  },
  ICRISAT: {
    acronyms: ['ICRISAT'],
    namePatterns: ['%Semi-Arid Tropics%'],
  },
  IFPRI: {
    acronyms: ['IFPRI'],
    namePatterns: ['%Food Policy Research%'],
  },
  IITA: {
    acronyms: ['IITA'],
    namePatterns: ['%International Institute of Tropical Agriculture%'],
  },
  ILRI: {
    acronyms: ['ILRI'],
    namePatterns: ['%International Livestock Research%'],
  },
  IRRI: {
    acronyms: ['IRRI'],
    namePatterns: ['%International Rice Research Institute%'],
  },
  IWMI: {
    acronyms: ['IWMI'],
    namePatterns: ['%International Water Management Institute%'],
  },
  WorldFish: {
    acronyms: ['WorldFish', 'World Fish'],
    namePatterns: ['%WorldFish%'],
  },
};

/** center label (key of CENTER_MATCHERS), name, email (already trimmed and lower-case). */
const FOCAL_POINTS: ReadonlyArray<readonly [string, string, string]> = [
  ['Alliance-Bioversity', 'Ivana Cortesini', 'i.cortesini@cgiar.org'],
  ['Alliance-Bioversity', 'Fabio Catini', 'f.catini@cgiar.org'],
  ['Alliance-CIAT', 'Ivana Cortesini', 'i.cortesini@cgiar.org'],
  ['Alliance-CIAT', 'Fabio Catini', 'f.catini@cgiar.org'],
  ['AfricaRice', 'Aminou Arouna', 'a.arouna@cgiar.org'],
  ['CIMMYT', 'Roberto Rocha', 'r.rocha@cgiar.org'],
  ['CIMMYT', 'Andrea Gardeazabal', 'a.gardeazabal@cgiar.org'],
  ['CIP', 'Richard Kalwande', 'r.kalwande@cgiar.org'],
  ['CIP', 'Alessandra Furtado', 'a.furtado@cgiar.org'],
  ['ICARDA', 'Enrico Bonaiuti', 'e.bonaiuti@cgiar.org'],
  ['ICRISAT', 'Mequanint Melesse', 'mequanint.melesse@icrisat.org'],
  ['IFPRI', 'Adam Kennedy', 'a.kennedy@cgiar.org'],
  ['IITA', 'Theresa Ampadu-Boakye', 't.ampadu-boakye@cgiar.org'],
  ['ILRI', 'Rose Chesoli', 'r.chesoli@cgiar.org'],
  ['IRRI', 'Justin Dela Rueda', 'j.delarueda@cgiar.org'],
  ['IWMI', 'Najeeb Ullah', 'n.ullah@cgiar.org'],
  ['WorldFish', 'Cristiano Rossignoli', 'c.rossignoli@cgiar.org'],
];

const PICK_ORDER = 'ORDER BY cc.is_active DESC, cc.code ASC LIMIT 1';

async function resolveCenterCode(
  queryRunner: QueryRunner,
  matcher: CenterMatcher,
): Promise<string | null> {
  for (const acronym of matcher.acronyms) {
    const rows: Array<{ code: string }> = await queryRunner.query(
      `
      SELECT cc.code AS code
      FROM \`clarisa_center\` cc
      JOIN \`clarisa_institutions\` ci ON ci.id = cc.institutionId
      WHERE LOWER(TRIM(ci.acronym)) = LOWER(?)
      ${PICK_ORDER};
      `,
      [acronym],
    );
    if (rows?.[0]?.code) return rows[0].code;
  }
  for (const pattern of matcher.namePatterns) {
    const rows: Array<{ code: string }> = await queryRunner.query(
      `
      SELECT cc.code AS code
      FROM \`clarisa_center\` cc
      JOIN \`clarisa_institutions\` ci ON ci.id = cc.institutionId
      WHERE ci.name LIKE ?
      ${PICK_ORDER};
      `,
      [pattern],
    );
    if (rows?.[0]?.code) return rows[0].code;
  }
  return null;
}

async function resolveAll(
  queryRunner: QueryRunner,
): Promise<Map<string, string | null>> {
  const resolved = new Map<string, string | null>();
  for (const [label, matcher] of Object.entries(CENTER_MATCHERS)) {
    resolved.set(label, await resolveCenterCode(queryRunner, matcher));
  }
  return resolved;
}

export class RIRSeedCenterMelFocalPoints1791800000000
  implements MigrationInterface
{
  name = 'RIRSeedCenterMelFocalPoints1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const codes = await resolveAll(queryRunner);

    const unresolved = [...codes.entries()]
      .filter(([, code]) => !code)
      .map(([label]) => label);
    if (unresolved.length > 0) {
      throw new Error(
        `RIR-SeedCenterMelFocalPoints: no clarisa_center matched these center labels: ${unresolved.join(', ')}. Nothing was inserted.`,
      );
    }
    if (codes.get('Alliance-Bioversity') === codes.get('Alliance-CIAT')) {
      throw new Error(
        'RIR-SeedCenterMelFocalPoints: the labels Alliance-Bioversity and Alliance-CIAT resolved to the same clarisa_center. Nothing was inserted.',
      );
    }

    for (const [label, name, email] of FOCAL_POINTS) {
      const centerCode = codes.get(label);
      await queryRunner.query(
        `
        INSERT INTO \`center_mel_focal_point\` (center_code, name, email)
        SELECT cc.code, ?, ?
        FROM \`clarisa_center\` cc
        WHERE cc.code = ?
          AND NOT EXISTS (
            SELECT 1 FROM \`center_mel_focal_point\` m
            WHERE m.center_code = cc.code AND m.email = ?
          );
        `,
        [name, email, centerCode, email],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const emails = [...new Set(FOCAL_POINTS.map(([, , email]) => email))];
    await queryRunner.query(
      `DELETE FROM \`center_mel_focal_point\` WHERE email IN (${emails.map(() => '?').join(', ')});`,
      emails,
    );
  }
}
