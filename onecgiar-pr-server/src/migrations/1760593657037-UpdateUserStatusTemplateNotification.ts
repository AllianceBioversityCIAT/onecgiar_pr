import { MigrationInterface, QueryRunner } from "typeorm";
import { EmailTemplate } from "../shared/microservices/email-notification-management/enum/email-notification.enum";

export class UpdateUserStatusTemplateNotification1760593657037 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            insert into \`template\`  (\`name\`, \`description\`, \`created_by\`, \`template\`)
            values (
                '${EmailTemplate.STATUS_UPDATE}',
                'email template to send when a user is activated or deactivated.',
                977,
                '<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>PRMS Reporting Tool</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700;800;900&display=swap"
            rel="stylesheet"
            />
            <style>
            * { font-family: "Poppins", system-ui; }
            body {
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 50px 20px;
                color: #000;
            }
            .header { padding: 20px; padding-bottom: 45px; max-width: 280px; }
            .content {
                background-color: #fafafa;
                padding: 40px 70px;
                border-radius: 5px;
                box-shadow: 0px 2px 11px 0px #b0c4ddb0;
                text-align: justify;
                margin-bottom: 50px;
                font-weight: 400;
                font-size: 14px;
            }
            .link { text-decoration: underline; color: #5569dd; }
            .footer { text-align: center; font-size: 13px; color: #666; }
            .footer-link {
                text-decoration: underline;
                color: #4b5057;
                font-weight: 500;
                font-size: 13px;
            }
            .footer-p { font-size: 12px; color: #666; }
            .fw-600 { font-weight: 600; }
            .no-underline { text-decoration: none; }
            </style>
        </head>
        <body>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="center">
                <table width="700" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                    <td class="header">
                        <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.svg" alt="PRMS Reporting tool" />
                    </td>
                    </tr>
                    <tr>
                    <td class="content">
                        <h2 class="fw-600" style="font-size: 18px">Dear {{userName}},</h2>
                        <p>Your PRMS user account has been updated by the system administrator.</p>
                        {{#if account_activated}}
                        <p>Your account has been <b>activated</b> and a new role has been assigned in the following entity(ies):</p>
                        <ul>
                            {{#each new_roles_assigned_per_entity}}
                            <li>{{this.initiative_code}} - {{this.initiative_name}} ({{this.role_name}})</li>
                            {{/each}}
                        </ul>
                        {{/if}}
                        {{#if account_deactivated}}
                        <p>Your user account in Reporting Tool has been <b>deactivated</b>.</p>
                        {{/if}}
                        <p>
                        Kind regards,<br />
                        The PRMS Team
                        </p>
                        <p class="footer-p">
                        If you encounter any issues or need assistance, don’t hesitate to contact our
                        support team at
                        <a href="mailto:PRMSTechSupport@cgiar.org" class="footer-link">
                            PRMSTechSupport@cgiar.org
                        </a>
                        </p>
                    </td>
                    </tr>
                    <tr>
                    <td style="padding-top: 50px">
                        <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Waves.svg" alt="PRMS Reporting tool" />
                    </td>
                    </tr>
                    <tr>
                    <td class="footer">
                        <p class="footer-p">
                        Your email and password provide access to all platforms in the PRMS ecosystem — TOC, OST, RISK, QA, Planning, and the Reporting Tool.
                        </p>
                    </td>
                    </tr>
                </table>
                </td>
            </tr>
            </table>
        </body>
        </html>')`
    );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM \`template\` WHERE name='${EmailTemplate.STATUS_UPDATE}'`,
        );
    }

}
