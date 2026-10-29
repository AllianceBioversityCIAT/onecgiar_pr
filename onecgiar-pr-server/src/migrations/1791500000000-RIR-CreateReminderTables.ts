// @akili-spec changes/replicated-innovation-reminders
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * INC-165323 `RIR-T-1` — storage, email templates and runtime parameters for the replicated
 * innovation reminder campaigns (`design.md` §3.1, §3.2; `requirements.md` RIR-R-5, R-8, R-11,
 * R-12, R-13, R-14).
 *
 * ## What it creates
 *
 * - `replicated_innovation_reminder_campaign` — one scheduled reminder per phase and kind, with the
 *   status lifecycle and the counts (`RIR-R-5`). Index (`status`, `scheduled_at`) serves the
 *   due-campaign scan of the hourly cron.
 * - `replicated_innovation_reminder_log` — one row per digest attempted. The UNIQUE (`campaign_id`,
 *   `recipient_email`) is the `RIR-R-8` exactly-once guard: the dispatcher INSERTs before it emits,
 *   and `ER_DUP_ENTRY` means someone else already owns that recipient.
 * - `initiative_melia_focal_point` — MELIA focal points per SP / Accelerator, with an active flag
 *   (`RIR-R-13`). UNIQUE (`initiative_id`, `email`). It is created empty: the rows come from a
 *   separate seed migration (blocked on DEP-1) so that list does not hold this one up.
 * - Two `template` rows, `email_template_replicated_innovation_q4_notice` and
 *   `email_template_replicated_innovation_final_reminder` (`RIR-R-11`), both NEW rows. No existing
 *   template row is read for its content, updated, deactivated or deleted.
 * - Four `global_parameters` rows in `platform_global_variables`: `rir_test_recipient_email` ('',
 *   `RIR-R-12`), `rir_batch_size` ('25'), `rir_batch_pause_ms` ('2000') and
 *   `rir_stale_sending_minutes` ('60') (`RIR-R-14`).
 *
 * ## Template variables (what the dispatcher renders with, `RIR-T-4`)
 *
 * Both templates take the same context, so one render path serves both kinds:
 *
 * - `leadName`        — display name of the To recipient (the Lead Contact Person).
 * - `phaseName`       — the phase name, e.g. "Reporting 2026".
 * - `resultCount`     — number of results listed.
 * - `results[]`       — `resultCode`, `resultTitle`, `resultTypeName`, `spCode`, `spName`,
 *                       `resultUrl` (`${RESULTS_URL}${result_code}/general-information?phase=${version_id}`).
 * - `intendedTo`      — OPTIONAL. Set only when a non-production dispatch redirected the mail
 *                       (`RIR-R-12`); it switches on the "Intended recipients" block.
 * - `intendedCc`      — OPTIONAL. The intended CC as one string; shown inside that block.
 *
 * The subject is not stored here: the dispatcher builds it (`${addLabel()} ... ${phaseName}`).
 * Every value is rendered with `{{ }}` (HTML-escaped), never `{{{ }}}`.
 *
 * The wording below is a FIRST DRAFT for DEP-2 (business review of the email copy); changing it
 * later is a new migration, not an edit of this one once it is in `master`.
 *
 * ## `created_by` without a hard-coded user id
 *
 * `template.created_by` is NOT NULL with a foreign key to `users`. It is taken from the row that
 * already exists for `email_template_ip_experts_support` (touched by several migrations, so it is
 * there), then from the oldest template row that has one. Unlike `1788446000000`, there is NO
 * literal fallback id: if neither exists the INSERT fails loudly on NOT NULL rather than invent a
 * user. Both lookups are sub-selects over `template` itself, so no user id is typed anywhere here.
 *
 * ## The four futures (repo rule 25)
 *
 *   - Applied without the new code: three empty tables, two unused templates, four unused
 *     parameters. Nothing reads them. Inert.
 *   - Code deployed without applying it: not a normal path. The Jenkins deployment applies
 *     migrations before the new code serves traffic (server `CLAUDE.md` §5), so no defensive code.
 *   - Applied twice: `CREATE TABLE IF NOT EXISTS`; every INSERT is `WHERE NOT EXISTS` on its
 *     natural key (template name, parameter name).
 *   - Reverted: `down` drops the three tables (log before campaign, for the foreign key) and
 *     deletes the two templates and the four parameters by name. That destroys campaign history,
 *     the send log and any MELIA rows by design (`design.md` §3.2); it never touches
 *     `email_template_ip_experts_support*` or any other template or parameter.
 */
export class RIRCreateReminderTables1791500000000
  implements MigrationInterface
{
  name = 'RIRCreateReminderTables1791500000000';

  private static readonly Q4_TEMPLATE_NAME =
    'email_template_replicated_innovation_q4_notice';
  private static readonly FINAL_TEMPLATE_NAME =
    'email_template_replicated_innovation_final_reminder';

  private static readonly PARAMETER_CATEGORY = 'platform_global_variables';

  /** name, value, description — values are strings because `global_parameters.value` is text. */
  private static readonly PARAMETERS: ReadonlyArray<
    readonly [string, string, string]
  > = [
    [
      'rir_test_recipient_email',
      '',
      'Replicated innovation reminders (INC-165323): the only address that receives reminder emails when IS_PRODUCTION is not true. Empty refuses any non-production dispatch. Ignored in production.',
    ],
    [
      'rir_batch_size',
      '25',
      'Replicated innovation reminders (INC-165323): number of digests published per batch.',
    ],
    [
      'rir_batch_pause_ms',
      '2000',
      'Replicated innovation reminders (INC-165323): pause in milliseconds between two batches.',
    ],
    [
      'rir_stale_sending_minutes',
      '60',
      'Replicated innovation reminders (INC-165323): minutes after which a campaign stuck in SENDING is released as FAILED so it can be retried.',
    ],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`replicated_innovation_reminder_campaign\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`version_id\` bigint NOT NULL,
        \`kind\` varchar(20) NOT NULL,
        \`scheduled_at\` datetime NOT NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'PENDING',
        \`claimed_at\` datetime NULL,
        \`sent_at\` datetime NULL,
        \`sent_count\` int NOT NULL DEFAULT 0,
        \`skipped_count\` int NOT NULL DEFAULT 0,
        \`failed_count\` int NOT NULL DEFAULT 0,
        \`unreachable_count\` int NOT NULL DEFAULT 0,
        \`last_error\` varchar(500) NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_rir_campaign_status_scheduled\` (\`status\`, \`scheduled_at\`),
        CONSTRAINT \`FK_rir_campaign_version\` FOREIGN KEY (\`version_id\`)
          REFERENCES \`version\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`replicated_innovation_reminder_log\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`campaign_id\` bigint NOT NULL,
        \`recipient_email\` varchar(150) NOT NULL,
        \`result_ids\` text NOT NULL,
        \`cc_count\` int NOT NULL DEFAULT 0,
        \`redirected\` tinyint NOT NULL DEFAULT 0,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_rir_log_campaign_recipient\` (\`campaign_id\`, \`recipient_email\`),
        CONSTRAINT \`FK_rir_log_campaign\` FOREIGN KEY (\`campaign_id\`)
          REFERENCES \`replicated_innovation_reminder_campaign\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`initiative_melia_focal_point\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`initiative_id\` int NOT NULL,
        \`name\` varchar(200) NULL,
        \`email\` varchar(150) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_rir_melia_initiative_email\` (\`initiative_id\`, \`email\`),
        CONSTRAINT \`FK_rir_melia_initiative\` FOREIGN KEY (\`initiative_id\`)
          REFERENCES \`clarisa_initiatives\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await this.insertTemplateIfMissing(
      queryRunner,
      RIRCreateReminderTables1791500000000.Q4_TEMPLATE_NAME,
      'INC-165323: Q4 notice sent to each Lead Contact Person listing their replicated innovations still in Editing for the active Reporting phase.',
      buildReminderTemplate({
        kindLabel: 'Q4 notice',
        intro:
          'The reporting period for <span class="fw-600">{{phaseName}}</span> is entering its final quarter. PRMS shows that {{resultCount}} replicated innovation(s) for which you are the Lead Contact Person are still in <span class="fw-600">Editing</span> status.',
        action:
          'Please open each innovation below, review the information carried over from the previous phase, update it where needed and submit it.',
      }),
    );

    await this.insertTemplateIfMissing(
      queryRunner,
      RIRCreateReminderTables1791500000000.FINAL_TEMPLATE_NAME,
      'INC-165323: final reminder sent to each Lead Contact Person listing their replicated innovations still in Editing for the active Reporting phase.',
      buildReminderTemplate({
        kindLabel: 'Final reminder',
        intro:
          'This is the final reminder for <span class="fw-600">{{phaseName}}</span>. PRMS still shows {{resultCount}} replicated innovation(s) for which you are the Lead Contact Person in <span class="fw-600">Editing</span> status.',
        action:
          'Please review, update and submit each innovation below before the reporting period closes.',
      }),
    );

    const { PARAMETERS } = RIRCreateReminderTables1791500000000;
    for (const [name, value, description] of PARAMETERS) {
      await this.insertParameterIfMissing(
        queryRunner,
        name,
        value,
        description,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`global_parameters\` WHERE name IN (?, ?, ?, ?);`,
      RIRCreateReminderTables1791500000000.PARAMETERS.map(([name]) => name),
    );

    await queryRunner.query(`DELETE FROM \`template\` WHERE name IN (?, ?);`, [
      RIRCreateReminderTables1791500000000.Q4_TEMPLATE_NAME,
      RIRCreateReminderTables1791500000000.FINAL_TEMPLATE_NAME,
    ]);

    // Log first: it holds the foreign key to the campaign.
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`replicated_innovation_reminder_log\`;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`replicated_innovation_reminder_campaign\`;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`initiative_melia_focal_point\`;`,
    );
  }

  private async insertTemplateIfMissing(
    queryRunner: QueryRunner,
    name: string,
    description: string,
    body: string,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO \`template\` (name, description, template, is_active, created_by, created_date, last_updated_date)
        SELECT
          ?, ?, ?, 1,
          COALESCE(
            (SELECT t2.created_by FROM \`template\` t2
              WHERE t2.name = 'email_template_ip_experts_support' LIMIT 1),
            (SELECT t3.created_by FROM \`template\` t3
              WHERE t3.created_by IS NOT NULL ORDER BY t3.id LIMIT 1)
          ),
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM \`template\` t WHERE t.name = ?);
      `,
      [name, description, body, name],
    );
  }

  private async insertParameterIfMissing(
    queryRunner: QueryRunner,
    name: string,
    value: string,
    description: string,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO \`global_parameters\` (name, value, description, global_parameter_category_id)
        SELECT
          ?, ?, ?,
          (SELECT c.id FROM \`global_parameter_categories\` c WHERE c.name = ? LIMIT 1)
        FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM \`global_parameters\` gp WHERE gp.name = ?);
      `,
      [
        name,
        value,
        description,
        RIRCreateReminderTables1791500000000.PARAMETER_CATEGORY,
        name,
      ],
    );
  }
}

interface ReminderTemplateCopy {
  /** Short label shown above the greeting, e.g. "Q4 notice". Plain text, no variables. */
  kindLabel: string;
  /** First paragraph. May use `{{phaseName}}` and `{{resultCount}}`. */
  intro: string;
  /** Call to action under the intro. */
  action: string;
}

/**
 * Both reminders share one layout and one variable set (see the class docblock), so only the copy
 * differs. The result is inserted through a bound parameter: nothing in it is SQL-escaped by hand,
 * which is why a single apostrophe in the copy is safe and a doubled one would be a bug.
 */
function buildReminderTemplate(copy: ReminderTemplateCopy): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PRMS Reporting Tool</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
* { font-family: 'Poppins', system-ui; }
body { line-height:1.6; max-width:800px; margin:0 auto; padding:50px 20px; color:#000; }
.header { padding:20px; padding-bottom:45px; max-width:280px; }
.content { background-color:#fafafa; padding:40px 50px; border-radius:5px; box-shadow:0px 2px 11px 0px #b0c4ddb0; margin-bottom:50px; font-weight:400; font-size:14px; }
.link { text-decoration:underline; color:#5569dd; }
.fw-600 { font-weight:600; }
.kind { display:inline-block; margin:0 0 14px; padding:2px 12px; border-radius:12px; background-color:#e8eefc; color:#3b4a8f; font-size:12px; font-weight:600; }
.results { width:100%; border-collapse:collapse; margin:18px 0 24px; font-size:13px; }
.results th { text-align:left; padding:8px 10px; border-bottom:2px solid #d5dbe6; color:#4a5568; font-weight:600; }
.results td { padding:10px; border-bottom:1px solid #e3e8ef; vertical-align:top; }
.muted { color:#666; font-size:12px; }
.redirect-notice { margin:0 0 24px; padding:12px 16px; border-left:3px solid #d9822b; background-color:#fff4e5; font-size:13px; }
.disclaimer { margin-top:26px; font-size:12px; color:#666; font-style:italic; }
</style>
</head>
<body>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse; margin:0 auto;">
<tr>
<td align="center">
<table width="700" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; margin:0 auto;">

<tr>
<td class="header">
<img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.svg" alt="PRMS Reporting Tool"/>
</td>
</tr>

<tr>
<td class="content">

{{#if intendedTo}}
<div class="redirect-notice">
<p class="fw-600" style="margin:0 0 4px;">Intended recipients (test message)</p>
<p style="margin:0;">PRMS is not running in production, so this message was redirected to a test address. In production it would be sent to <span class="fw-600">{{intendedTo}}</span>{{#if intendedCc}} with <span class="fw-600">{{intendedCc}}</span> in copy{{/if}}.</p>
</div>
{{/if}}

<p class="kind">${copy.kindLabel}</p>

<h2 class="fw-600" style="font-size:18px; margin-top:0;">Dear {{leadName}},</h2>

<p>${copy.intro}</p>

<p>${copy.action}</p>

<table role="presentation" class="results" cellspacing="0" cellpadding="0" border="0">
<thead>
<tr>
<th>Code</th>
<th>Innovation</th>
<th>Science Program / Accelerator</th>
<th>Link</th>
</tr>
</thead>
<tbody>
{{#each results}}
<tr>
<td>{{resultCode}}</td>
<td><span class="fw-600">{{resultTitle}}</span><br/><span class="muted">{{resultTypeName}}</span></td>
<td>{{spCode}} - {{spName}}</td>
<td><a class="link" href="{{resultUrl}}">Open</a></td>
</tr>
{{/each}}
</tbody>
</table>

<p>Thank you for keeping your results up to date.</p>

<p class="disclaimer">This is an automated message from the CGIAR PRMS system. Please do not reply directly to this email.</p>

</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}
