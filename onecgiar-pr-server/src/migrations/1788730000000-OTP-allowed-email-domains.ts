import { MigrationInterface, QueryRunner } from 'typeorm';

// @akili-spec changes/cognito-email-otp-login (OTP-T-4)
const OTP_ALLOWED_EMAIL_DOMAINS_NAME = 'OTP_ALLOWED_EMAIL_DOMAINS';

export class OTPAllowedEmailDomains1788730000000
  implements MigrationInterface
{
  name = 'OTPAllowedEmailDomains1788730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO global_parameters (name, value, description, global_parameter_category_id)
      VALUES
        (?, '', 'Comma-separated, lower-case, no-@ list of email domains allowed to sign in via the Center (email one-time-code) login path. Empty keeps the path hidden.', (SELECT id FROM global_parameter_categories WHERE name = 'platform_global_variables'));
      `,
      [OTP_ALLOWED_EMAIL_DOMAINS_NAME],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM global_parameters WHERE name = ?;`,
      [OTP_ALLOWED_EMAIL_DOMAINS_NAME],
    );
  }
}
