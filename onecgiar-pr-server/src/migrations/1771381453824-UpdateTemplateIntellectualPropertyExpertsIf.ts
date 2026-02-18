import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTemplateIntellectualPropertyExpertsIf1771381453824 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE template
          SET template = '
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PRMS Reporting Tool</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <style>
    * { font-family: ''Poppins'', system-ui; }
    body { line-height:1.6; max-width:800px; margin:0 auto; padding:50px 20px; color:#000; }
    .header { padding:20px; padding-bottom:45px; max-width:280px; }
    .content { background-color:#fafafa; padding:40px 70px; border-radius:5px; box-shadow:0px 2px 11px 0px #b0c4ddb0; text-align:justify; margin-bottom:50px; font-weight:400; font-size:14px; }
    .link { text-decoration:underline; color:#5569dd; }
    .footer { padding-top:30px; text-align:center; font-size:13px; color:#666; }
    .footer-link { text-decoration:underline; color:#4b5057; font-weight:500; font-size:14px; }
    .fw-600 { font-weight:600; }
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
    
    <h2 class="fw-600" style="font-size:18px;">Dear {{userName}},</h2>
    
    <p>
    The {{spCode}} - {{spName}} has submitted an Innovation Development result through the
    <span class="fw-600">PRMS Reporting Tool</span>, and the team has indicated that they would like to receive
    support from an Intellectual Property (IP) expert.
    </p>
    
    <p>
    For effective follow-up and traceability, please take note of the following key information related to this request:
    </p>
    
    <p>
    <span class="fw-600">Title of the innovation:</span> {{resultTitle}}<br/>
    
    {{#if leadCenter}}
    <span class="fw-600">Center requested for Intellectual Property support:</span> {{leadCenter}}<br/>
    {{/if}}
    
    <span class="fw-600">Contact Person:</span> {{contactPerson}}<br/>
    
    {{#if contributingCenters}}
    <span class="fw-600">Collaborating centers:</span> {{contributingCenters}}<br/>
    {{/if}}
    
    <span class="fw-600">Link to innovation result:</span>
    <a href="{{resultUrl}}" class="link fw-600">View Innovation Result</a>
    </p>
    
    <p>
    As part of the next steps, you are expected to follow up by getting in touch with the relevant PRMS Lead Contact
    person at your Center. As the Center IP Focal Point, you will determine the appropriate course of action moving forward.
    </p>
    
    <p>
    If you encounter any issues or require technical assistance, please do not hesitate to contact our support team at
    <a href="mailto:PRMSTechSupport@cgiar.org" class="link fw-600">PRMSTechSupport@cgiar.org</a>.
    </p>
    
    <p>
    Kind regards,<br/>
    <span class="fw-600">The PRMS Team</span>
    </p>
    
    </td>
    </tr>
    
    <tr>
    <td style="padding-top:50px;">
    <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Waves.svg" alt="PRMS Reporting Tool"/>
    </td>
    </tr>
    
    <tr>
    <td class="footer">
    <p>
    You are receiving this email because you are registered in the PRMS Reporting Tool as a user.
    If you no longer want to receive emails from us, please go to the configuration section in the
    <a href="https://prms.ciat.cgiar.org/notifications" class="link">notification module</a>.
    </p>
    
    <a href="mailto:PRMSTechSupport@cgiar.org" class="footer-link">
    PRMSTechSupport@cgiar.org
    </a>
    </td>
    </tr>
    
    </table>
    </td>
    </tr>
    </table>
    </body>
    </html>'
          WHERE name = 'email_template_ip_experts_support';
        `);
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE template
          SET template = '
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PRMS Reporting Tool</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <style>
    * { font-family: ''Poppins'', system-ui; }
    body { line-height:1.6; max-width:800px; margin:0 auto; padding:50px 20px; color:#000; }
    .header { padding:20px; padding-bottom:45px; max-width:280px; }
    .content { background-color:#fafafa; padding:40px 70px; border-radius:5px; box-shadow:0px 2px 11px 0px #b0c4ddb0; text-align:justify; margin-bottom:50px; font-weight:400; font-size:14px; }
    .link { text-decoration:underline; color:#5569dd; }
    .footer { padding-top:30px; text-align:center; font-size:13px; color:#666; }
    .footer-link { text-decoration:underline; color:#4b5057; font-weight:500; font-size:14px; }
    .fw-600 { font-weight:600; }
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
    
    <h2 class="fw-600" style="font-size:18px;">Dear {{userName}},</h2>
    
    <p>
    The {{spCode}} - {{spName}} has submitted an Innovation Development result in the
    <span class="fw-600">PRMS Reporting Tool</span>, and the team is seeking support
    from an Intellectual Property expert.
    </p>
    
    <p>You can find the details of the submitted innovation here:</p>
    
    <p>
    <a href="{{resultUrl}}" class="link fw-600">
    View Innovation Result
    </a>
    </p>
    
    <p>
    If you encounter any issues or need assistance, don’t hesitate to contact our support team at
    <a href="mailto:PRMSTechSupport@cgiar.org" class="link fw-600">
    PRMSTechSupport@cgiar.org
    </a>.
    </p>
    
    <p>
    Kind regards,<br />
    <span class="fw-600">The PRMS Team</span>
    </p>
    
    </td>
    </tr>
    
    <tr>
    <td style="padding-top:50px;">
    <img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Waves.svg" alt="PRMS Reporting Tool"/>
    </td>
    </tr>
    
    <tr>
    <td class="footer">
    <p>
    You are receiving this email because you are registered in the PRMS Reporting Tool as a user.
    If you no longer want to receive emails from us, please go to the configuration section in the
    <a href="https://prms.ciat.cgiar.org/notifications" class="link">notification module</a>.
    </p>
    
    <a href="mailto:PRMSTechSupport@cgiar.org" class="footer-link">
    PRMSTechSupport@cgiar.org
    </a>
    </td>
    </tr>
    
    </table>
    </td>
    </tr>
    </table>
    </body>
    </html>'
          WHERE name = 'email_template_ip_experts_support';
    `);
    }
}