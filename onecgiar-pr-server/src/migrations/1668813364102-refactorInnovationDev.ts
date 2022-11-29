import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorInnovationDev1668813364102 implements MigrationInterface {
    name = 'refactorInnovationDev1668813364102'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`innovation_characterization_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`innovation_nature_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`innovation_readiness_level_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_5c097105d235165407671c91f31\` FOREIGN KEY (\`innovation_characterization_id\`) REFERENCES \`clarisa_innovation_characteristic\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_d86517dde191238b2f4b7ac89d1\` FOREIGN KEY (\`innovation_nature_id\`) REFERENCES \`clarisa_innovation_type\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_5e727a0f93a6f2cd1da1287240e\` FOREIGN KEY (\`innovation_readiness_level_id\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_5e727a0f93a6f2cd1da1287240e\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_d86517dde191238b2f4b7ac89d1\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_5c097105d235165407671c91f31\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`innovation_readiness_level_id\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`innovation_nature_id\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`innovation_characterization_id\``);
    }

}
