// @akili-spec changes/replicated-innovation-reminders
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * INC-165323 `RIR-T-10` — recipient model v2 (`design.md` §3, §15.3, `RIR-DD-9`;
 * `requirements.md` RIR-R-8, R-11, R-18).
 *
 * ## What it changes
 *
 * - `replicated_innovation_reminder_log`: new `message_key varchar(200) NOT NULL`, backfilled with
 *   `CONCAT('DEVELOPER:', recipient_email)`; the exactly-once guard moves from UNIQUE
 *   (`campaign_id`, `recipient_email`) to UNIQUE (`campaign_id`, `message_key`), so one address can
 *   legitimately receive more than one message per campaign (developer digest + MELIA summary).
 *   Key formats: `DEVELOPER:<email>`, `MELIA_SUMMARY:<initiative_id>`, `CENTER:<center code>`.
 * - `center_mel_focal_point`: Center MEL focal points, FK to `clarisa_center.code` (varchar(15)).
 *   Created empty; rows come from a later seed migration (DEP-5).
 * - Templates: the bodies of the two EXISTING RIR rows (`..._q4_notice`, `..._final_reminder`,
 *   updated by name only) become the developer digest; two NEW rows are inserted
 *   (`..._melia_summary`, `..._center`). No template row that RIR did not create is touched.
 *
 * ## Index ordering (MySQL error 1553)
 *
 * `FK_rir_log_campaign` needs an index whose first column is `campaign_id`. The new UNIQUE is
 * created BEFORE the old one is dropped (and, in `down`, the old one is created before the new one
 * is dropped), so an eligible index always exists.
 *
 * ## The four futures (repo rule 25)
 *
 *   - Applied without the new code: the old dispatcher would insert log rows without
 *     `message_key` (NOT NULL violation). Not a normal path: Jenkins applies migrations before
 *     the new code serves traffic.
 *   - Code deployed without applying it: same, not a normal path.
 *   - Applied twice: column / index / table are guarded by existence checks; templates are
 *     UPDATE by name and INSERT ... WHERE NOT EXISTS.
 *   - Reverted: `down` restores the old bodies verbatim, deletes the 2 new templates, drops the
 *     center table, restores the old unique then drops the new one and the column. Log rows that
 *     are not `DEVELOPER:` keys (MELIA summary / center) are deleted first: they cannot satisfy
 *     the old (`campaign_id`, `recipient_email`) unique.
 *
 * Template values go through bound parameters; nothing is SQL-escaped by hand.
 */
export class RIRRecipientModelV21791700000000 implements MigrationInterface {
  name = 'RIRRecipientModelV21791700000000';

  private static readonly Q4_TEMPLATE_NAME =
    'email_template_replicated_innovation_q4_notice';
  private static readonly FINAL_TEMPLATE_NAME =
    'email_template_replicated_innovation_final_reminder';
  private static readonly MELIA_TEMPLATE_NAME =
    'email_template_replicated_innovation_melia_summary';
  private static readonly CENTER_TEMPLATE_NAME =
    'email_template_replicated_innovation_center';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const C = RIRRecipientModelV21791700000000;

    // --- log: message_key + index swap -------------------------------------------------
    if (
      !(await queryRunner.hasColumn(
        'replicated_innovation_reminder_log',
        'message_key',
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE \`replicated_innovation_reminder_log\` ADD COLUMN \`message_key\` varchar(200) NULL;`,
      );
    }
    await queryRunner.query(
      `UPDATE \`replicated_innovation_reminder_log\` SET \`message_key\` = CONCAT('DEVELOPER:', \`recipient_email\`) WHERE \`message_key\` IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE \`replicated_innovation_reminder_log\` MODIFY COLUMN \`message_key\` varchar(200) NOT NULL;`,
    );

    // New unique first: FK_rir_log_campaign keeps a usable index while the old one is dropped.
    if (!(await this.hasIndex(queryRunner, 'UQ_rir_log_campaign_message'))) {
      await queryRunner.query(
        `ALTER TABLE \`replicated_innovation_reminder_log\` ADD UNIQUE INDEX \`UQ_rir_log_campaign_message\` (\`campaign_id\`, \`message_key\`);`,
      );
    }
    if (await this.hasIndex(queryRunner, 'UQ_rir_log_campaign_recipient')) {
      await queryRunner.query(
        `ALTER TABLE \`replicated_innovation_reminder_log\` DROP INDEX \`UQ_rir_log_campaign_recipient\`;`,
      );
    }

    // --- center MEL focal points -------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`center_mel_focal_point\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`center_code\` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
        \`name\` varchar(200) NULL,
        \`email\` varchar(150) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_rir_center_mel_center_email\` (\`center_code\`, \`email\`),
        CONSTRAINT \`FK_rir_center_mel_center\` FOREIGN KEY (\`center_code\`)
          REFERENCES \`clarisa_center\` (\`code\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    // --- templates ---------------------------------------------------------------------
    const digest = buildDigestTemplate();
    await this.updateTemplateBody(queryRunner, C.Q4_TEMPLATE_NAME, digest);
    await this.updateTemplateBody(queryRunner, C.FINAL_TEMPLATE_NAME, digest);

    await this.insertTemplateIfMissing(
      queryRunner,
      C.MELIA_TEMPLATE_NAME,
      'INC-165323: reminder summary sent to the MELIA focal points of a Science Program / Accelerator for innovations whose developers cannot be reached through PRMS.',
      buildMeliaSummaryTemplate(),
    );
    await this.insertTemplateIfMissing(
      queryRunner,
      C.CENTER_TEMPLATE_NAME,
      'INC-165323: reminder sent to the Center MEL focal points listing the bilateral innovations of their center with no update yet.',
      buildCenterTemplate(),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const C = RIRRecipientModelV21791700000000;

    await this.updateTemplateBody(
      queryRunner,
      C.Q4_TEMPLATE_NAME,
      buildLegacyReminderTemplate({
        kindLabel: 'Q4 notice',
        intro:
          'The reporting period for <span class="fw-600">{{phaseName}}</span> is entering its final quarter. PRMS shows that {{resultCount}} replicated innovation(s) for which you are the Lead Contact Person are still in <span class="fw-600">Editing</span> status.',
        action:
          'Please open each innovation below, review the information carried over from the previous phase, update it where needed and submit it.',
      }),
    );
    await this.updateTemplateBody(
      queryRunner,
      C.FINAL_TEMPLATE_NAME,
      buildLegacyReminderTemplate({
        kindLabel: 'Final reminder',
        intro:
          'This is the final reminder for <span class="fw-600">{{phaseName}}</span>. PRMS still shows {{resultCount}} replicated innovation(s) for which you are the Lead Contact Person in <span class="fw-600">Editing</span> status.',
        action:
          'Please review, update and submit each innovation below before the reporting period closes.',
      }),
    );
    await queryRunner.query(`DELETE FROM \`template\` WHERE name IN (?, ?);`, [
      C.MELIA_TEMPLATE_NAME,
      C.CENTER_TEMPLATE_NAME,
    ]);

    await queryRunner.query(`DROP TABLE IF EXISTS \`center_mel_focal_point\`;`);

    // Rows of the new message types cannot satisfy the old (campaign, recipient) unique.
    await queryRunner.query(
      `DELETE FROM \`replicated_innovation_reminder_log\` WHERE \`message_key\` NOT LIKE 'DEVELOPER:%';`,
    );
    // Old unique first (FK keeps an index), then the new one, then the column.
    if (!(await this.hasIndex(queryRunner, 'UQ_rir_log_campaign_recipient'))) {
      await queryRunner.query(
        `ALTER TABLE \`replicated_innovation_reminder_log\` ADD UNIQUE INDEX \`UQ_rir_log_campaign_recipient\` (\`campaign_id\`, \`recipient_email\`);`,
      );
    }
    if (await this.hasIndex(queryRunner, 'UQ_rir_log_campaign_message')) {
      await queryRunner.query(
        `ALTER TABLE \`replicated_innovation_reminder_log\` DROP INDEX \`UQ_rir_log_campaign_message\`;`,
      );
    }
    if (
      await queryRunner.hasColumn(
        'replicated_innovation_reminder_log',
        'message_key',
      )
    ) {
      await queryRunner.query(
        `ALTER TABLE \`replicated_innovation_reminder_log\` DROP COLUMN \`message_key\`;`,
      );
    }
  }

  private async hasIndex(
    queryRunner: QueryRunner,
    indexName: string,
  ): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'replicated_innovation_reminder_log'
          AND index_name = ? LIMIT 1;`,
      [indexName],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  /** By name only: never touches a row RIR did not create. */
  private async updateTemplateBody(
    queryRunner: QueryRunner,
    name: string,
    body: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE \`template\` SET \`template\` = ?, last_updated_date = CURRENT_TIMESTAMP WHERE name = ?;`,
      [body, name],
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
}

// ---------------------------------------------------------------------------------------
// New copy (v2). One shell, three bodies. Vars: kindLabel, leadName, phaseName, phaseYear,
// nextYear, resultCount, results[], spCode, spName, centerName, intendedTo, intendedCc.
// ---------------------------------------------------------------------------------------

const SHELL_HEAD = `<!DOCTYPE html>
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

<p class="kind">{{kindLabel}}</p>
`;

const SHELL_TAIL = `
<p>For existing innovations that receive active investment in {{phaseYear}}, you only need to update changes, all other existing data will be pre-filled for you to review. This should not take much of your time.</p>

<p>For existing innovations that did not receive investment in {{phaseYear}}, were stopped or put on-hold, you can indicate status 'Inactive' and provide the reason for discontinuation.</p>

<p>If you do not update your innovation result, then PRMS will automatically close them with the status 'Inactive – not updated' at the end of January {{nextYear}}. You can reopen and update an innovation in any later reporting phase ({{nextYear}} and beyond).</p>

<p>This update helps CGIAR keep its innovation records current and monitor their progress over the years. Thank you for your contribution to this process; it is much appreciated.</p>

<p class="disclaimer">This is an automated message from the CGIAR PRMS system. Please do not reply directly to this email.</p>

</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

const SP_CELL = `{{#if spCode}}{{spCode}}{{#if spName}} – {{spName}}{{/if}}{{/if}}`;

function buildBody(
  greeting: string,
  intro: string,
  withDeveloperColumn: boolean,
): string {
  const devHead = withDeveloperColumn
    ? '\n<th>Innovation developer (as listed)</th>'
    : '';
  const devCell = withDeveloperColumn
    ? '\n<td>{{#if developerText}}{{developerText}}{{else}}Not provided{{/if}}</td>'
    : '';
  return `${SHELL_HEAD}
<h2 class="fw-600" style="font-size:18px; margin-top:0;">${greeting}</h2>

<p>${intro}</p>

<table role="presentation" class="results" cellspacing="0" cellpadding="0" border="0">
<thead>
<tr>
<th>Result ID</th>
<th>Innovation</th>
<th>Science Program / Accelerator</th>${devHead}
</tr>
</thead>
<tbody>
{{#each results}}
<tr>
<td>{{resultCode}}</td>
<td><a class="link" href="{{resultUrl}}">{{resultTitle}}</a> · {{resultTypeName}}</td>
<td>${SP_CELL}</td>${devCell}
</tr>
{{/each}}
</tbody>
</table>
${SHELL_TAIL}`;
}

function buildDigestTemplate(): string {
  return buildBody(
    'Dear {{leadName}},',
    'The CGIAR Performance and Results Management System (PRMS) shows that you have {{resultCount}} innovation(s), reported in previous years, with no update yet to reflect any work done on them during the {{phaseYear}} reporting period:',
    false,
  );
}

function buildMeliaSummaryTemplate(): string {
  return buildBody(
    'Dear MELIA focal point(s) of {{spCode}}{{#if spName}} – {{spName}}{{/if}},',
    'The CGIAR Performance and Results Management System (PRMS) shows that {{resultCount}} innovation(s) of your Program/Accelerator, reported in previous years, have no update yet for the {{phaseYear}} reporting period, and no innovation developer listed on them can be reached through PRMS. Please follow up with the teams concerned:',
    true,
  );
}

function buildCenterTemplate(): string {
  return buildBody(
    'Dear Center MEL focal point(s) of {{centerName}},',
    'The CGIAR Performance and Results Management System (PRMS) shows that your center has {{resultCount}} bilateral innovation(s), reported in previous years, with no update yet to reflect any work done on them during the {{phaseYear}} reporting period:',
    false,
  );
}

// ---------------------------------------------------------------------------------------
// Legacy (v1) bodies, copied verbatim from 1791500000000-RIR-CreateReminderTables so `down`
// restores them exactly.
// ---------------------------------------------------------------------------------------

interface LegacyReminderTemplateCopy {
  kindLabel: string;
  intro: string;
  action: string;
}

function buildLegacyReminderTemplate(copy: LegacyReminderTemplateCopy): string {
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
