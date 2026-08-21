import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3166 Phase 2 — outbound webhook delivery to external platforms.
 *
 * Two tables:
 *
 * - `webhook_endpoint`: where to deliver. Polymorphic on `recipient_type` on purpose. Ticket AC3
 *   says "external center **or** platform", and only the platform case is resolvable today (Phase 1
 *   persisted `result.external_platform_id` from the CLARISA API key). Whether centres are also
 *   recipients is an open product question — with the discriminator, the answer changes which rows
 *   exist rather than requiring another migration and a resolver rewrite.
 *
 * - `webhook_delivery`: the outbox. One row per delivery, carrying its own retry state. This is what
 *   makes AC4/AC5 data rather than log lines, which `docs/prd.md` AC-8 requires ("failures MUST be
 *   recoverable without manual SQL"): replaying an abandoned delivery is flipping `status` back to
 *   PENDING. The status/attempts/error column shape is copied from `bilateral_ai_jobs`
 *   (1784921546787) rather than inventing a second convention for the same idea.
 *
 * Two columns exist for correctness, not for data:
 *   - `status` includes SENDING so the dispatcher can claim a row *before* sending it. That is what
 *     makes a double cron run safe, which the repo requires of every scheduled task.
 *   - `alerted_at` makes the AC5 alert exactly-once instead of once per cron tick.
 *
 * `url` and `secret` live here and are never logged, echoed, or placed in an email — `docs/prd.md`
 * AC-9 names webhooks explicitly, and `.cursorrules` forbids even partial webhook URLs in output.
 * The AC5 alert quotes `recipient_acronym` and this table's `id` instead, which is why the acronym
 * is denormalised onto the endpoint row.
 */
export class CreateWebhookTables1787500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`webhook_endpoint\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`recipient_type\` varchar(20) NOT NULL,
        \`recipient_id\` int NOT NULL,
        \`recipient_acronym\` varchar(50) NULL,
        \`url\` varchar(500) NOT NULL,
        \`secret\` varchar(255) NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_webhook_endpoint_recipient\` (\`recipient_type\`, \`recipient_id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`webhook_delivery\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`endpoint_id\` int NOT NULL,
        \`decision\` varchar(10) NOT NULL,
        \`payload\` json NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'PENDING',
        \`attempts\` int NOT NULL DEFAULT 0,
        \`last_http_status\` int NULL,
        \`last_error\` text NULL,
        \`next_attempt_at\` timestamp NULL,
        \`alerted_at\` timestamp NULL,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_webhook_delivery_due\` (\`status\`, \`next_attempt_at\`),
        INDEX \`IDX_webhook_delivery_result\` (\`result_id\`),
        CONSTRAINT \`FK_webhook_delivery_result\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_webhook_delivery_endpoint\` FOREIGN KEY (\`endpoint_id\`) REFERENCES \`webhook_endpoint\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: `webhook_delivery` holds the FK to `webhook_endpoint`.
    await queryRunner.query(`DROP TABLE \`webhook_delivery\``);
    await queryRunner.query(`DROP TABLE \`webhook_endpoint\``);
  }
}
