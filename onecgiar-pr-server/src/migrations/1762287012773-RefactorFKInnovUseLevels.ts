import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorFKInnovUseLevels1762287012773 implements MigrationInterface {
    name = 'RefactorFKInnovUseLevels1762287012773'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP FOREIGN KEY \`FK_ec5a8dbb5d0e02ed352fd445b29\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` CHANGE \`innovation_readiness_level_id\` \`innovation_use_level_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`innovation_use_level_id\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`innovation_use_level_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD CONSTRAINT \`FK_78e5ebf20790108449de743893d\` FOREIGN KEY (\`innovation_use_level_id\`) REFERENCES \`clarisa_innovation_use_levels\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP FOREIGN KEY \`FK_78e5ebf20790108449de743893d\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`innovation_use_level_id\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`innovation_use_level_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` CHANGE \`innovation_use_level_id\` \`innovation_readiness_level_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD CONSTRAINT \`FK_ec5a8dbb5d0e02ed352fd445b29\` FOREIGN KEY (\`innovation_readiness_level_id\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
