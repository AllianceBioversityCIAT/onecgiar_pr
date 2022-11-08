import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorOtherResultsEntities1665252057791
  implements MigrationInterface
{
  name = 'refactorOtherResultsEntities1665252057791';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_470e3f625a6cd0a303591587628\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`createdById\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`creation_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`creation_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`creation_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`creation_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` CHANGE \`created_date\` \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`created_by\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_73cf3e6ca5a84f6fb065860b4dd\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`update result_level 
                                set description = 'A durable change in the condition of people and their environment brought about by a chain of events or change to which research, innovations and related activities have contributed.'
                                where name = 'Impact';`);
    await queryRunner.query(`update result_level 
                                set description = 'A change in knowledge, skills, attitudes and/or relationships, which manifests as a change in behavior in particular actors, to which research outputs and related activities have contributed.'
                                where name = 'Outcome';`);
    await queryRunner.query(`update result_level 
                                set description = 'Knowledge, or a technical or institutional advancement produced by CGIAR research, engagement and/or capacity development activities.'
                                where name = 'Output';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_73cf3e6ca5a84f6fb065860b4dd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`created_by\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` CHANGE \`created_date\` \`created_date\` timestamp(0) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`creation_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`creation_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`last_updated_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`creation_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`creation_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`createdById\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_470e3f625a6cd0a303591587628\` FOREIGN KEY (\`createdById\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
