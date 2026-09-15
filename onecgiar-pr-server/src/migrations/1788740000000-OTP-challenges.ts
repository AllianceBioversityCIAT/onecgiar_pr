import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `otp_challenges` — the PRMS-owned sign-in code store.
 *
 * @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1
 * "Storage", requirements.md §15 OTP-R-37)
 *
 * ## Why a table at all
 *
 * Until rev 3 the challenge lived in a Cognito `CUSTOM_AUTH` session: Cognito held
 * the code, the attempt count and the expiry. The PROD pool sits in an AWS account
 * where the team has console access to Cognito only — no Lambda, no CloudFormation —
 * so the triggers that would mint that code cannot be deployed there. Option D moves
 * the whole lifecycle into PRMS, and a lifecycle needs somewhere to live.
 *
 * ## Why these columns and no others
 *
 * - `nonce` — the 22-char base64url segment that also sits inside the opaque session
 *   string handed to the client. UNIQUE, because it is the lookup key and a collision
 *   would hand one user another's challenge. 32 chars of headroom over the 22 used.
 * - `email_hash` — `HMAC(key_email, normalised_email)`. 🛑 The address itself is NOT
 *   stored (`OTP-R-11`): a dump of this table must not reveal who asked for a code.
 *   Indexed so a future "codes requested for this address" support query stays cheap.
 * - `code_hmac` — `HMAC(key_code, nonce|code)`. The code itself is likewise never
 *   stored, and binding it to the nonce makes a stolen HMAC useless on another row.
 * - `expires_at`, `attempts`, `consumed_at` — the three states the spec distinguishes
 *   at verify (expired / too many tries / already used). Collapsing any two would
 *   collapse two different answers to the user into one.
 * - `created_at` — purge diagnostics only; there is no audit story here.
 *
 * No `is_active`, no `created_by`, no soft delete: this is throw-away authentication
 * state with a 5-minute life and an hourly purge, not an audited business row.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: an empty table nobody queries. Inert.
 *   - Code deployed without applying it: `startOtp` would fail to insert and answer
 *     the neutral 503 — no login for center users until the migration runs. The
 *     Jenkins pipeline applies migrations before the backend serves traffic.
 *   - Applied twice: guarded by `CREATE TABLE IF NOT EXISTS`.
 *   - Reverted with data inside: dropping loses at most a handful of in-flight
 *     5-minute codes; every affected user simply requests a new one. Unlike a
 *     business record, there is nothing here worth refusing the drop for — so
 *     `down` drops unconditionally.
 */
export class OTPChallenges1788740000000 implements MigrationInterface {
  name = 'OTPChallenges1788740000000';

  private static readonly TABLE = 'otp_challenges';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`${OTPChallenges1788740000000.TABLE}\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`nonce\` varchar(32) NOT NULL COMMENT 'base64url nonce shared with the opaque session string; the only link between a session and its challenge.',
        \`email_hash\` char(64) NOT NULL COMMENT 'HMAC of the normalised email under a JWT_SKEY-derived key. Never the address itself (OTP-R-11).',
        \`code_hmac\` char(64) NOT NULL COMMENT 'HMAC of nonce|code under a distinct JWT_SKEY-derived key. Never the code itself (OTP-R-37).',
        \`expires_at\` datetime NOT NULL COMMENT 'Start time + 5 minutes.',
        \`attempts\` tinyint NOT NULL DEFAULT 0 COMMENT 'Wrong codes so far; 3 exhausts the challenge.',
        \`consumed_at\` datetime NULL COMMENT 'Stamped on the single successful verification — a code is one-shot.',
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_otp_challenges_nonce\` (\`nonce\`),
        INDEX \`IDX_otp_challenges_email_hash\` (\`email_hash\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`${OTPChallenges1788740000000.TABLE}\`;`,
    );
  }
}
