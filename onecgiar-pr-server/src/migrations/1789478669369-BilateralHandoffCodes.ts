import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `bilateral_handoff_codes` — the PRMS-owned sign-in handoff code store for
 * the Bulk Results Uploader handoff.
 *
 * @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-1, design.md §3.1
 * "Entities", §3.2 "Migrations", requirements.md §6 R-3, R-4, R-11)
 *
 * ## Why a table at all
 *
 * `start` (`POST /api/bilateral/center/handoff`) mints a 32-byte opaque code
 * that a verified PRMS session redeems once, 120 s later, from the partner
 * backend (`exchange`). The runtime is Lambda **and** Docker in parallel with
 * no shared process memory, so the single-use guarantee (R-7) has to live in
 * a row a compare-and-set `UPDATE` can lock — the same mechanism
 * `otp_challenges.consumed_at` already uses.
 *
 * ## Why these columns and no others
 *
 * - `code_hash` — SHA-256 hex of the plaintext code. UNIQUE, because it is
 *   the exchange lookup key. 🛑 The plaintext code is NEVER stored (R-3): a
 *   dump of this table must not yield a value the original code can be
 *   recovered from. Plain SHA-256, no HMAC — unlike `otp_challenges.code_hmac`,
 *   which protects a short, guessable 6–8 digit code, a 256-bit random value's
 *   hash is not invertible in practice (`BIL-HO-DD-3`).
 * - `user_id`, `center_code` — who the code was minted for and which centre,
 *   needed to invalidate a user's live codes on remint (R-4) and to authorise
 *   the mint in the first place. Real `FOREIGN KEY`s into `users` and
 *   `clarisa_center` — both PK columns compatible with the referencing types.
 *   `center_code` carries an explicit `collation: 'utf8mb3_unicode_ci'` on the
 *   entity (verified live against `clarisa_center.code`, which is
 *   `utf8mb3_unicode_ci` while this schema's default is `utf8mb3_general_ci`)
 *   so the `FOREIGN KEY` below does not fail with errno 3780 on
 *   `migration:run` — same reasoning as
 *   `IntellectualPropertyExpert.center_code`.
 * - `audience` — the partner application the code was minted for (R-30),
 *   compared at exchange time so a code cannot be redeemed by the wrong
 *   partner even before it expires.
 * - `expires_at`, `consumed_at` — the two states the single-use compare-and-set
 *   `UPDATE` distinguishes (R-7); collapsing them would collapse "expired" and
 *   "already redeemed" into one, and R-8 needs both to still answer identically
 *   to a caller while auditing differently server-side (`design.md` §5 E2).
 * - `consumed_by_platform_id`, `consumed_by_platform_acronym` — the calling
 *   platform's CLARISA identity at redemption time, denormalised so the audit
 *   trail (R-11) survives a CLARISA rename.
 * - `auth_method` — copied from the session at mint time (`BIL-HO-DD-4`, S5')
 *   so `exchange` can return it without re-reading the session; not personal
 *   data.
 * - `created_at` — purge diagnostics only (R-20); there is no broader audit
 *   story here.
 *
 * 🛑 Nothing R-3's "database dump" scenario forbids is present: no e-mail
 * column, no claims column (claims are assembled at exchange time from
 * `users` / `role_by_user` / `clarisa_center` / `clarisa_institutions` / the
 * open Reporting phase — never persisted), no plaintext code column.
 *
 * No `is_active`, no `created_by`, no soft delete: this is throw-away
 * authentication state with a 120 s life and an opportunistic purge (R-20),
 * not an audited business row — same reasoning as `otp_challenges`
 * (`src/migrations/1788740000000-OTP-challenges.ts`).
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: an empty table nobody queries. Inert.
 *   - Code deployed without applying it: `start` would fail to insert and the
 *     CTA would error on mint — no handoff until the migration runs. The
 *     Jenkins pipeline applies migrations before the backend serves traffic.
 *   - Applied twice: the `CREATE TABLE` is guarded by `IF NOT EXISTS`, so a
 *     second run is inert for the table itself, but the two `ADD CONSTRAINT`
 *     statements are not idempotent — a second application against an
 *     already-created table would fail with errno 1826 (duplicate foreign
 *     key) rather than being inert. In practice TypeORM's own `migrations`
 *     table prevents a migration from being applied twice, so this is a
 *     theoretical exposure, not a real one.
 *   - Reverted with rows inside: dropping loses at most a couple of minutes of
 *     in-flight, single-use, 120 s codes. Users click the CTA again. Unlike a
 *     business record, there is nothing here worth refusing the drop for.
 *
 * ## Pruning note
 *
 * `npm run migration:generate` also emitted 246 unrelated statements (123 in
 * `up`, 123 in `down`) from drift between the entities and the applied
 * migrations (483 executed vs 474 migration files on the checked dev DB at
 * generation time — `migration:check` reported this before this migration
 * existed). Most of that drift pre-dates this change, but not all of it: 12
 * of the 246 (`otp_challenges.{nonce,email_hash,code_hmac,expires_at,
 * attempts,consumed_at}`, one pair each) are self-inflicted by
 * `1788740000000-OTP-challenges.ts` hand-adding `COMMENT '…'` clauses to that
 * table's `CREATE TABLE` against an entity that declares no `comment:` on any
 * of those columns — exactly the drift-generating mistake this migration's
 * first draft also made and was corrected out of, below. Every one of the
 * 246 foreign statements was removed by hand; only `bilateral_handoff_codes`
 * is kept below, and its column list matches what `migration:generate`
 * emitted for this table verbatim (no hand-added `COMMENT` clauses — the
 * entity declares none, and adding them to the DDL without also adding them
 * to the entity would have made this same drift recur on the next
 * `migration:generate`).
 */
export class BilateralHandoffCodes1789478669369
  implements MigrationInterface
{
  name = 'BilateralHandoffCodes1789478669369';

  private static readonly TABLE = 'bilateral_handoff_codes';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`${BilateralHandoffCodes1789478669369.TABLE}\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`code_hash\` char(64) NOT NULL,
        \`user_id\` int NOT NULL,
        \`center_code\` varchar(45) COLLATE "utf8mb3_unicode_ci" NOT NULL,
        \`audience\` varchar(100) NOT NULL,
        \`expires_at\` datetime NOT NULL,
        \`consumed_at\` datetime NULL,
        \`consumed_by_platform_id\` int NULL,
        \`consumed_by_platform_acronym\` varchar(50) NULL,
        \`auth_method\` varchar(16) NULL,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_bilateral_handoff_codes_code_hash\` (\`code_hash\`),
        INDEX \`IDX_bilateral_handoff_codes_user_live\` (\`user_id\`, \`consumed_at\`, \`expires_at\`)
      ) ENGINE=InnoDB
    `);

    // Constraint names below are exactly what TypeORM's generator derived from the
    // current entity metadata (a content hash, not hand-picked) — kept verbatim so a
    // future \`migration:generate\` diffs clean against this table instead of proposing
    // a rename.
    await queryRunner.query(`
      ALTER TABLE \`${BilateralHandoffCodes1789478669369.TABLE}\`
        ADD CONSTRAINT \`FK_d2bd6d45b05c64a3b9968ca7688\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`${BilateralHandoffCodes1789478669369.TABLE}\`
        ADD CONSTRAINT \`FK_0238a72647ef79446ddd8bd09cd\`
        FOREIGN KEY (\`center_code\`) REFERENCES \`clarisa_center\`(\`code\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`${BilateralHandoffCodes1789478669369.TABLE}\`;`,
    );
  }
}
