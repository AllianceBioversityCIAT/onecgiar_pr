import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 2026-09-04 — the mail that tells an uploader their bilateral AI text-mining job finished.
 *
 * AI processing takes minutes and the uploader has usually moved on; the client stopped
 * force-redirecting on completion the same day (it yanked users out of whatever they were editing),
 * so this mail — sent by `BilateralAiService.sendResultsReadyEmail` — is what brings them back to
 * the centre's Drafts list to review the identified results.
 *
 * Templates live in this repo's `template` table and are rendered with handlebars by the service
 * that sends them, the same as every other PRMS mail. Placeholders: `user_name`, `result_count`,
 * `result_plural`, `center_acronym`, `drafts_url`. Idempotent insert; `created_by` 977 matches the
 * seeded-template convention (`1764594729968-IntellectualPropertyTemplate`,
 * `1787510000000-SeedWebhookFailureAlertTemplate`).
 */
export class SeedBilateralAiResultsReadyTemplate1788700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const templateHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PRMS Reporting Tool</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>
          * { font-family: 'Poppins', system-ui; }
          body { line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 50px 20px; color: #000; }
          .header { border-bottom: 2px solid #1689ca; padding-bottom: 12px; margin-bottom: 24px; }
          .header h2 { margin: 0; color: #1689ca; font-size: 20px; }
          .count { background: #f7f9fc; border-left: 3px solid #1689ca; padding: 12px 16px; margin: 24px 0; font-size: 15px; }
          .cta { display: inline-block; margin: 8px 0 24px; padding: 12px 24px; background: #1689ca; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .note { font-size: 13px; color: #4a5568; }
          .footer { margin-top: 32px; font-size: 12px; color: #718096; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Your AI-identified results are ready</h2>
        </div>

        <p>Dear {{user_name}},</p>

        <p>
          The AI processing of the document you uploaded for <strong>{{center_acronym}}</strong>
          has finished.
        </p>

        <div class="count">
          <strong>{{result_count}} result draft{{result_plural}}</strong> identified and ready for your review.
        </div>

        <p>
          Open the Drafts section to review each candidate, complete its information and create the
          bilateral result{{result_plural}}, or discard the ones that do not apply.
        </p>

        <a class="cta" href="{{drafts_url}}">Review the drafts</a>

        <p class="note">
          If the button does not work, copy this address into your browser:<br />
          {{drafts_url}}
        </p>

        <div class="footer">
          PRMS Reporting Tool — automated message. Please do not reply.
        </div>
      </body>
      </html>
    `;

    await queryRunner.query(
      `
      INSERT INTO template (name, description, template, is_active, created_by, created_date, last_updated_date)
      SELECT
        'email_template_bilateral_ai_results_ready',
        'Tells the uploader their bilateral AI text-mining job finished and links to the centre Drafts list (2026-09-04).',
        ?,
        1,
        977,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM template WHERE name = 'email_template_bilateral_ai_results_ready'
      )
      `,
      [templateHtml],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM template WHERE name = 'email_template_bilateral_ai_results_ready'`,
    );
  }
}
