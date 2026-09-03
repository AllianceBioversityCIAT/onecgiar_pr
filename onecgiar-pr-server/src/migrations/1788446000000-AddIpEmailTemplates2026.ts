import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3272 / P2-3513 item 3 — the two Intellectual Property emails, in the wording business
 * finally supplied.
 *
 * Ángel added both texts to P2-3272's description on 3 Sep 2026 at 09:54 (he edits the story
 * instead of commenting, so there is no comment to cite). Until then this was the one piece of
 * the epic genuinely blocked on business.
 *
 * ## Why two NEW rows and not an UPDATE of `email_template_ip_experts_support`
 *
 * There is precedent for updating that row in place — four migrations already do it
 * (`1764594729968`, `1765805047192`, `1771276023098`, `1771381453824`). This one does not, and the
 * reason is the phase axis:
 *
 * - There is exactly ONE row per template name, shared by every phase.
 * - The existing wording describes the **four separate IPR questions**, which still exist and are
 *   still answered in the 2025 form.
 * - Ángel's new wording describes the **single consolidated question** that replaced them from
 *   2026 (P2-3272 part 1).
 *
 * ⇒ Overwriting the row would send 2026 wording to someone who answered the 2025 form. A 2025
 * result can still be submitted, so that is a live path, not a historical one.
 *
 * So: two new rows for 2026, the 2025 row untouched, and
 * `SubmissionsService._prepareEmailData` picks by `phase_year` — the same axis used everywhere
 * else in this epic. Portfolio would be wrong: P25 holds both 2025 and 2026 results.
 *
 * ## What each row is
 *
 * - `email_template_ip_experts_support_2026` — to the Lead Centre IP Focal Point. Replaces, for
 *   2026 only, a body that referred to a question the reporter never saw.
 * - `email_template_ip_support_confirmation_2026` — to the Lead Contact Person, confirming the
 *   referral. **This email does not exist today in any phase**; the story asks for it and nothing
 *   was ever sent.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: two unused rows. Nothing reads them. Inert.
 *   - Code deployed without applying it: `_prepareEmailData` finds no row and returns early — the
 *     submission still succeeds, no email goes out, and a warning is logged. Chosen deliberately:
 *     a missing template must never cost the reporter their submission.
 *   - Applied twice: both inserts are `WHERE NOT EXISTS` on the template name.
 *   - Reverted: `down` deletes only these two rows, by name, and only while nothing points at
 *     them. It never touches `email_template_ip_experts_support` — that row is not ours to undo.
 *
 * `created_by` is NOT NULL with a foreign key to `users`, so it is taken from the row that
 * already exists (`email_template_ip_experts_support`, touched by four migrations, so it is
 * there), falling back to 977 — the id the original insert in `1764594729968` used and which
 * therefore is known to exist.
 *
 * Additive only: no existing template row is updated, deactivated or deleted.
 */
export class AddIpEmailTemplates20261788446000000
  implements MigrationInterface
{
  name = 'AddIpEmailTemplates20261788446000000';

  private static readonly EXPERT_TEMPLATE_NAME =
    'email_template_ip_experts_support_2026';
  private static readonly CONFIRMATION_TEMPLATE_NAME =
    'email_template_ip_support_confirmation_2026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.insertTemplateIfMissing(
      queryRunner,
      AddIpEmailTemplates20261788446000000.EXPERT_TEMPLATE_NAME,
      'P2-3272: IP support request sent to the Lead Centre IP Focal Point when a 2026 Innovation Development result is submitted with the consolidated IPR question answered Yes or Not sure.',
      EXPERT_TEMPLATE,
    );

    await this.insertTemplateIfMissing(
      queryRunner,
      AddIpEmailTemplates20261788446000000.CONFIRMATION_TEMPLATE_NAME,
      'P2-3272: confirmation sent to the Lead Contact Person telling them their IP support request was referred to the Centre IP Focal Point(s).',
      CONFIRMATION_TEMPLATE,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of [
      AddIpEmailTemplates20261788446000000.EXPERT_TEMPLATE_NAME,
      AddIpEmailTemplates20261788446000000.CONFIRMATION_TEMPLATE_NAME,
    ]) {
      // `template` is self-referencing through `parent_id` and is pointed at by
      // `platform_report`. Deleting a row something depends on would fail on the FK, so check.
      const referenced: { total: number }[] = await queryRunner.query(
        `
          SELECT
            (SELECT COUNT(*) FROM \`template\` c
              WHERE c.parent_id = (SELECT t.id FROM \`template\` t WHERE t.name = ? LIMIT 1))
            +
            (SELECT COUNT(*) FROM \`platform_report\` pr
              WHERE pr.template_id = (SELECT t.id FROM \`template\` t WHERE t.name = ? LIMIT 1))
            AS total;
        `,
        [name, name],
      );

      if (Number(referenced?.[0]?.total ?? 0) > 0) {
        continue;
      }

      await queryRunner.query(`DELETE FROM \`template\` WHERE name = ?;`, [
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
        SELECT
          ?, ?, ?, 1,
          COALESCE(
            (SELECT t2.created_by FROM \`template\` t2
              WHERE t2.name = 'email_template_ip_experts_support' LIMIT 1),
            977
          ),
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE NOT EXISTS (SELECT 1 FROM \`template\` t WHERE t.name = ?);
      `,
      [name, description, body, name],
    );
  }
}

const EXPERT_TEMPLATE = `    <!DOCTYPE html>
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
    .content { background-color:#fafafa; padding:40px 70px; border-radius:5px; box-shadow:0px 2px 11px 0px #b0c4ddb0; text-align:justify; margin-bottom:50px; font-weight:400; font-size:14px; }
    .link { text-decoration:underline; color:#5569dd; }
    .footer { padding-top:30px; text-align:center; font-size:13px; color:#666; }
    .footer-link { text-decoration:underline; color:#4b5057; font-weight:500; font-size:14px; }
    .fw-600 { font-weight:600; }
    .detail-list { margin:14px 0 22px; padding-left:18px; }
    .detail-list li { margin-bottom:6px; }
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

    <h2 class="fw-600" style="font-size:18px;">Dear {{leadCenter}} IP Focal Point,</h2>

    <p>A PRMS user has flagged a need for Intellectual Property (IP) consultation regarding an
    innovation reported in the CGIAR Performance and Results Management System (PRMS).</p>

    <p class="fw-600">Innovation details:</p>
    <ul class="detail-list">
    <li><span class="fw-600">Title:</span> {{resultTitle}}</li>
    <li><span class="fw-600">PRMS Record ID:</span> {{resultCode}}</li>
    <li><span class="fw-600">Lead Program/Accelerator:</span> {{spName}} ({{spCode}})</li>
    <li><span class="fw-600">Requesting user:</span> {{contactPerson}}</li>
    </ul>

    <p class="fw-600">Next steps:</p>
    <p>Please reach out to the requesting user directly to discuss their specific IP
    considerations. Your support may include:</p>
    <ul class="detail-list">
    <li>Intellectual Property management strategy (patents, plant breeders' rights, trademarks, etc.)</li>
    <li>Development of value propositions and business models</li>
    <li>Support in negotiations with private sector partners</li>
    </ul>

    <p>Thank you for your support.</p>

    <p class="disclaimer">This is an automated message from the CGIAR PRMS system. Please do not reply directly to this email.</p>

    </td>
    </tr>

    <tr>
    <td class="footer">
    <a class="footer-link" href="{{resultUrl}}">Open the result in PRMS</a>
    </td>
    </tr>

    </table>
    </td>
    </tr>
    </table>
    </body>
    </html>`;

const CONFIRMATION_TEMPLATE = `    <!DOCTYPE html>
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
    .content { background-color:#fafafa; padding:40px 70px; border-radius:5px; box-shadow:0px 2px 11px 0px #b0c4ddb0; text-align:justify; margin-bottom:50px; font-weight:400; font-size:14px; }
    .link { text-decoration:underline; color:#5569dd; }
    .footer { padding-top:30px; text-align:center; font-size:13px; color:#666; }
    .footer-link { text-decoration:underline; color:#4b5057; font-weight:500; font-size:14px; }
    .fw-600 { font-weight:600; }
    .detail-list { margin:14px 0 22px; padding-left:18px; }
    .detail-list li { margin-bottom:6px; }
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

    <h2 class="fw-600" style="font-size:18px;">Dear {{contactPersonName}},</h2>

    <p>This is to confirm that your request for Intellectual Property support regarding the
    innovation <span class="fw-600">{{resultTitle}}</span> has been submitted to the relevant
    CGIAR Center IP Focal Point(s).</p>

    <p class="fw-600">What happens next?</p>
    <ul class="detail-list">
    <li>The IP Focal Point(s) will review your request and reach out to you directly to schedule a consultation.</li>
    <li>They can assist with IP management strategy, value proposition development, business modeling, and private sector negotiation support.</li>
    </ul>

    <p class="fw-600">Referral sent to:</p>
    <ul class="detail-list">
    <li>{{referralRecipients}}</li>
    </ul>

    <p>You may also contact the IP Focal Point directly if you have additional information to share
    before they reach out.</p>

    <p class="disclaimer">This is an automated message from the CGIAR PRMS system. Please do not reply directly to this email.</p>

    </td>
    </tr>

    <tr>
    <td class="footer">
    <a class="footer-link" href="{{resultUrl}}">Open the result in PRMS</a>
    </td>
    </tr>

    </table>
    </td>
    </tr>
    </table>
    </body>
    </html>`;
