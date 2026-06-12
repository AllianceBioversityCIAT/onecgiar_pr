import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Solo `phase_initiative_reporting_access` (P2-2821).
 * El resto del diff de migration:generate se omitió a propósito.
 */
export class PhaseInitiativeReporting1773838993334 implements MigrationInterface {
  name = 'PhaseInitiativeReporting1773838993334';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`phase_initiative_reporting_access\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`version_id\` bigint NOT NULL, \`initiative_id\` int NOT NULL, \`reporting_enabled\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`last_updated_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`UQ_phase_initiative_reporting\` (\`version_id\`, \`initiative_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`phase_initiative_reporting_access\` ADD CONSTRAINT \`FK_cffbed10dd9aa193aa2936468be\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`phase_initiative_reporting_access\` ADD CONSTRAINT \`FK_c0bb3ad65e582c82dab4df65495\` FOREIGN KEY (\`initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`phase_initiative_reporting_access\` DROP FOREIGN KEY \`FK_c0bb3ad65e582c82dab4df65495\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`phase_initiative_reporting_access\` DROP FOREIGN KEY \`FK_cffbed10dd9aa193aa2936468be\``,
    );
    await queryRunner.query(`DROP TABLE \`phase_initiative_reporting_access\``);
  }
}
