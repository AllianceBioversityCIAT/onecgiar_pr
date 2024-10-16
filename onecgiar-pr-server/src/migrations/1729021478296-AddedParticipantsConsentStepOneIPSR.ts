import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedParticipantsConsentStepOneIPSR1729021478296
  implements MigrationInterface
{
  name = 'AddedParticipantsConsentStepOneIPSR1729021478296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_package\` ADD \`participants_consent\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_package\` DROP COLUMN \`participants_consent\``,
    );
  }
}
