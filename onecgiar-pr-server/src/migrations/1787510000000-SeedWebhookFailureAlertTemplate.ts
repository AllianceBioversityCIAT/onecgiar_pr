import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3166 AC5 — the alert body for an abandoned webhook delivery.
 *
 * Templates live in this repo's `template` table and are rendered with handlebars by the service
 * that sends them (see `WebhookAlertService`), the same as every other PRMS mail. So this needs no
 * coordination with any external service.
 *
 * **What is deliberately not in this template: the destination URL.** Ticket AC5 asks for it, but
 * `docs/prd.md` AC-9 lists webhooks among the things that "MUST NEVER be logged, printed, or echoed",
 * and `.cursorrules` forbids webhook URLs "completas o parciales" in output. The alert names the
 * recipient by acronym and quotes the `webhook_delivery.id`; whoever investigates joins that to
 * `webhook_endpoint` for the URL. Declared in the P2-3166 Jira comment and in
 * `docs/specs/bilateral/webhook-external-platforms/requirements.md` §5.
 *
 * `created_by` 977 matches the seeded-template convention already used by
 * `1764594729968-IntellectualPropertyTemplate`.
 */
export class SeedWebhookFailureAlertTemplate1787510000000
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
          table { border-collapse: collapse; width: 100%; margin: 24px 0; }
          th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e3e8ef; font-size: 14px; }
          th { width: 40%; color: #4a5568; font-weight: 500; }
          .note { background: #f7f9fc; border-left: 3px solid #1689ca; padding: 12px 16px; font-size: 13px; color: #4a5568; }
          .footer { margin-top: 32px; font-size: 12px; color: #718096; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Webhook delivery failed</h2>
        </div>

        <p>
          A webhook notification for a bilateral result could not be delivered and has been
          abandoned after all retry attempts. The external platform has <strong>not</strong> been
          informed of the review decision.
        </p>

        <table>
          <tr><th>Result ID</th><td>{{result_id}}</td></tr>
          <tr><th>Recipient</th><td>{{recipient}}</td></tr>
          <tr><th>Delivery ID</th><td>{{delivery_id}}</td></tr>
          <tr><th>Error code</th><td>{{error_code}}</td></tr>
          <tr><th>Attempts</th><td>{{attempts}}</td></tr>
        </table>

        <p class="note">
          The destination URL is intentionally omitted from this email. Look up delivery
          <strong>{{delivery_id}}</strong> in <code>webhook_delivery</code> and follow
          <code>endpoint_id</code> into <code>webhook_endpoint</code> for the endpoint configuration.
          Setting the row's status back to <code>PENDING</code> re-queues the delivery.
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
        'email_template_webhook_delivery_failed',
        'Alerts the PRMS technical team when a bilateral result webhook delivery is abandoned after all retries (P2-3166 AC5).',
        ?,
        1,
        977,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM template WHERE name = 'email_template_webhook_delivery_failed'
      )
      `,
      [templateHtml],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM template WHERE name = 'email_template_webhook_delivery_failed'`,
    );
  }
}
