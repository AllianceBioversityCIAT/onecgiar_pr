import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `APF-T-1` (M3) — `bilateral-ai/ai-processing-feedback`. The two new terminal-state mail
 * templates (`APF-R-4`) and the `{{#if late}}` addition to the existing results-ready template
 * (design.md §3.2 M3, §6.4).
 *
 * `email_template_bilateral_ai_results_ready` (id 24 on the shared dev DB checked for this
 * migration) has **no prior seed migration** — it was inserted out of band, not through
 * `src/migrations/`. Its current body was read read-only from the DB (a `SELECT` only, no
 * `migration:run`/`migration:revert`) so the `down` below can restore it verbatim;
 * `OLD_RESULTS_READY_TEMPLATE` is that body byte-for-byte. `NEW_RESULTS_READY_TEMPLATE` is the
 * same body with one addition: an optional `{{#if late}}...{{/if}}` note between the
 * result-count paragraph and the "Open the Drafts section" paragraph, rendered only when
 * `APF-R-2` Scenario A's late-arrival path sets `late = true` (a job that timed out and then
 * completed anyway). Both the `UPDATE` and its inverse are guarded on the presence of the
 * `{{#if late}}` marker so a re-run (or a run against an environment already carrying the block)
 * is a no-op.
 *
 * Variables used (kept intentionally small — listed here so `APF-T-3`, which builds the render
 * data, binds to these names and no others):
 * - `email_template_bilateral_ai_results_ready` (unchanged existing vars + new): `user_name`,
 *   `center_acronym`, `result_count`, `result_plural`, `drafts_url`, + `late`.
 * - `email_template_bilateral_ai_no_candidates`: `user_name`, `center_acronym`, `source_plural`,
 *   `source_mix`, `duration_minutes`, `create_url`.
 * - `email_template_bilateral_ai_failed`: `user_name`, `center_acronym`, `error_cause`,
 *   `retry_url`.
 *
 * `created_by` 977 matches the seeded-template convention (`1764594729968`,
 * `1787510000000-SeedWebhookFailureAlertTemplate`).
 */
export class AddBilateralAiTerminalEmailTemplates1788762000000
  implements MigrationInterface
{
  name = 'AddBilateralAiTerminalEmailTemplates1788762000000';

  private static readonly NO_CANDIDATES_NAME =
    'email_template_bilateral_ai_no_candidates';
  private static readonly FAILED_NAME = 'email_template_bilateral_ai_failed';
  private static readonly RESULTS_READY_NAME =
    'email_template_bilateral_ai_results_ready';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.insertTemplateIfMissing(
      queryRunner,
      AddBilateralAiTerminalEmailTemplates1788762000000.NO_CANDIDATES_NAME,
      'APF-R-4: tells the uploader their bilateral AI text-mining job finished but no result drafts could be identified, with a link back to the upload step to try again with more context.',
      NO_CANDIDATES_TEMPLATE,
    );

    await this.insertTemplateIfMissing(
      queryRunner,
      AddBilateralAiTerminalEmailTemplates1788762000000.FAILED_NAME,
      "APF-R-4: tells the uploader their bilateral AI text-mining job failed, with the cause in plain words and a 'Try again' link that re-enqueues the same stored sources.",
      FAILED_TEMPLATE,
    );

    await queryRunner.query(
      `
        UPDATE \`template\`
        SET template = ?, last_updated_date = CURRENT_TIMESTAMP
        WHERE name = ? AND template NOT LIKE '%{{#if late}}%'
      `,
      [
        NEW_RESULTS_READY_TEMPLATE,
        AddBilateralAiTerminalEmailTemplates1788762000000.RESULTS_READY_NAME,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        UPDATE \`template\`
        SET template = ?, last_updated_date = CURRENT_TIMESTAMP
        WHERE name = ? AND template LIKE '%{{#if late}}%'
      `,
      [
        OLD_RESULTS_READY_TEMPLATE,
        AddBilateralAiTerminalEmailTemplates1788762000000.RESULTS_READY_NAME,
      ],
    );

    for (const name of [
      AddBilateralAiTerminalEmailTemplates1788762000000.FAILED_NAME,
      AddBilateralAiTerminalEmailTemplates1788762000000.NO_CANDIDATES_NAME,
    ]) {
      await queryRunner.query('DELETE FROM `template` WHERE name = ?;', [
        name,
      ]);
    }
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
        SELECT ?, ?, ?, 1, 977, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE NOT EXISTS (SELECT 1 FROM \`template\` t WHERE t.name = ?);
      `,
      [name, description, body, name],
    );
  }
}

const NO_CANDIDATES_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>PRMS Reporting Tool</title>
  </head>
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; line-height:1.6; color:#000;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <table width="700" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">

            <!-- HEADER -->
            <tr>
              <td align="center" style="padding:20px 0;">
                <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.png"
                     width="280" style="display:block;" alt="PRMS Reporting tool" />
              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="background-color:#fafafa; padding:40px 20px; text-align:justify; font-size:14px; font-weight:400;">
                <h2 style="font-size:18px; font-weight:600; margin:0 0 20px 0;">Dear {{user_name}},</h2>
                <p>The AI processing of the document{{source_plural}} you uploaded for <b>{{center_acronym}}</b> has finished ({{source_mix}}, {{duration_minutes}} min), but no result drafts could be identified.</p>

                <p>This can happen when the source material does not contain enough reportable detail. Try again with more context, additional documents, or a different recording.</p>

                <p>
                  <a href="{{create_url}}" style="color:#4b5057; text-decoration:underline;">Upload more context</a>
                </p>

                <p>Kind regards,<br/>The PRMS Team</p>

                <p style="font-size:12px; color:#666; margin-top:20px;">
                  If you encounter any issues or need assistance, don&rsquo;t hesitate to contact our support team at
                  <a href="mailto:PRMSTechSupport@cgiar.org" style="color:#4b5057; text-decoration:underline;">PRMSTechSupport@cgiar.org</a>
                </p>
              </td>
            </tr>

            <!-- FOOTER IMAGE -->
            <tr>
              <td align="center" style="padding:20px 0;">
                <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Waves.png"
                     width="700" style="display:block;" alt="PRMS Reporting tool" />
              </td>
            </tr>

            <!-- FOOTER TEXT -->
            <tr>
              <td style="text-align:center; font-size:12px; color:#666; padding:20px 0;">
                Your email and password provide access to all platforms in the PRMS ecosystem &mdash; TOC, OST, RISK, QA, Planning, and the Reporting Tool.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const FAILED_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>PRMS Reporting Tool</title>
  </head>
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; line-height:1.6; color:#000;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <table width="700" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">

            <!-- HEADER -->
            <tr>
              <td align="center" style="padding:20px 0;">
                <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.png"
                     width="280" style="display:block;" alt="PRMS Reporting tool" />
              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="background-color:#fafafa; padding:40px 20px; text-align:justify; font-size:14px; font-weight:400;">
                <h2 style="font-size:18px; font-weight:600; margin:0 0 20px 0;">Dear {{user_name}},</h2>
                <p>The AI processing of the document you uploaded for <b>{{center_acronym}}</b> could not be completed.</p>

                <p><b>Cause:</b> {{error_cause}}</p>

                <p>
                  You can try again without re-uploading your files:
                  <a href="{{retry_url}}" style="color:#4b5057; text-decoration:underline;">Try again</a>
                </p>

                <p>Kind regards,<br/>The PRMS Team</p>

                <p style="font-size:12px; color:#666; margin-top:20px;">
                  If you encounter any issues or need assistance, don&rsquo;t hesitate to contact our support team at
                  <a href="mailto:PRMSTechSupport@cgiar.org" style="color:#4b5057; text-decoration:underline;">PRMSTechSupport@cgiar.org</a>
                </p>
              </td>
            </tr>

            <!-- FOOTER IMAGE -->
            <tr>
              <td align="center" style="padding:20px 0;">
                <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Waves.png"
                     width="700" style="display:block;" alt="PRMS Reporting tool" />
              </td>
            </tr>

            <!-- FOOTER TEXT -->
            <tr>
              <td style="text-align:center; font-size:12px; color:#666; padding:20px 0;">
                Your email and password provide access to all platforms in the PRMS ecosystem &mdash; TOC, OST, RISK, QA, Planning, and the Reporting Tool.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const OLD_RESULTS_READY_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>PRMS Reporting Tool</title>
  </head>
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; line-height:1.6; color:#000;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <table width="700" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">

            <!-- HEADER -->
            <tr>
              <td align="center" style="padding:20px 0;">
                <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.png"
                     width="280" style="display:block;" alt="PRMS Reporting tool" />
              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="background-color:#fafafa; padding:40px 20px; text-align:justify; font-size:14px; font-weight:400;">
                <h2 style="font-size:18px; font-weight:600; margin:0 0 20px 0;">Dear {{user_name}},</h2>
                <p>The AI processing of the document you uploaded for <b>{{center_acronym}}</b> has finished.</p>

                <p><b>{{result_count}} result draft{{result_plural}}</b> {{#if result_plural}}were{{else}}was{{/if}} identified and {{#if result_plural}}are{{else}}is{{/if}} ready for your review.</p>

                <p>
                  Open the Drafts section to review each candidate, complete its information and create the
                  bilateral result{{result_plural}}, or discard the ones that do not apply:
                  <a href="{{drafts_url}}" style="color:#4b5057; text-decoration:underline;">Review the drafts</a>
                </p>

                <p>Kind regards,<br/>The PRMS Team</p>

                <p style="font-size:12px; color:#666; margin-top:20px;">
                  If you encounter any issues or need assistance, don&rsquo;t hesitate to contact our support team at
                  <a href="mailto:PRMSTechSupport@cgiar.org" style="color:#4b5057; text-decoration:underline;">PRMSTechSupport@cgiar.org</a>
                </p>
              </td>
            </tr>

            <!-- FOOTER IMAGE -->
            <tr>
              <td align="center" style="padding:20px 0;">
                <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Waves.png"
                     width="700" style="display:block;" alt="PRMS Reporting tool" />
              </td>
            </tr>

            <!-- FOOTER TEXT -->
            <tr>
              <td style="text-align:center; font-size:12px; color:#666; padding:20px 0;">
                Your email and password provide access to all platforms in the PRMS ecosystem &mdash; TOC, OST, RISK, QA, Planning, and the Reporting Tool.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const NEW_RESULTS_READY_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>PRMS Reporting Tool</title>
  </head>
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; line-height:1.6; color:#000;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <table width="700" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">

            <!-- HEADER -->
            <tr>
              <td align="center" style="padding:20px 0;">
                <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.png"
                     width="280" style="display:block;" alt="PRMS Reporting tool" />
              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="background-color:#fafafa; padding:40px 20px; text-align:justify; font-size:14px; font-weight:400;">
                <h2 style="font-size:18px; font-weight:600; margin:0 0 20px 0;">Dear {{user_name}},</h2>
                <p>The AI processing of the document you uploaded for <b>{{center_acronym}}</b> has finished.</p>

                <p><b>{{result_count}} result draft{{result_plural}}</b> {{#if result_plural}}were{{else}}was{{/if}} identified and {{#if result_plural}}are{{else}}is{{/if}} ready for your review.</p>

                {{#if late}}
                <p style="font-style:italic; color:#666;">This took a little longer than expected, but your results have arrived after all.</p>
                {{/if}}

                <p>
                  Open the Drafts section to review each candidate, complete its information and create the
                  bilateral result{{result_plural}}, or discard the ones that do not apply:
                  <a href="{{drafts_url}}" style="color:#4b5057; text-decoration:underline;">Review the drafts</a>
                </p>

                <p>Kind regards,<br/>The PRMS Team</p>

                <p style="font-size:12px; color:#666; margin-top:20px;">
                  If you encounter any issues or need assistance, don&rsquo;t hesitate to contact our support team at
                  <a href="mailto:PRMSTechSupport@cgiar.org" style="color:#4b5057; text-decoration:underline;">PRMSTechSupport@cgiar.org</a>
                </p>
              </td>
            </tr>

            <!-- FOOTER IMAGE -->
            <tr>
              <td align="center" style="padding:20px 0;">
                <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Waves.png"
                     width="700" style="display:block;" alt="PRMS Reporting tool" />
              </td>
            </tr>

            <!-- FOOTER TEXT -->
            <tr>
              <td style="text-align:center; font-size:12px; color:#666; padding:20px 0;">
                Your email and password provide access to all platforms in the PRMS ecosystem &mdash; TOC, OST, RISK, QA, Planning, and the Reporting Tool.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
