import { MigrationInterface, QueryRunner } from "typeorm";

export class addMissingVersion1676926679295 implements MigrationInterface {
    name = 'addMissingVersion1676926679295'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_region\` ADD \`version_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_country\` ADD \`version_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`linked_result\` ADD \`version_id\` bigint NULL`);
        await queryRunner.query(`UPDATE \`result_region\` set version_id = 1`);
        await queryRunner.query(`UPDATE \`result_country\` set version_id = 1`);
        await queryRunner.query(`UPDATE \`linked_result\` set version_id = 1`);
        await queryRunner.query(`ALTER TABLE \`result_region\` ADD CONSTRAINT \`FK_5d6f88e9ad16eaaab4cd2ab2a1e\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_country\` ADD CONSTRAINT \`FK_5e91e009ff0f7b1266d959d64aa\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`linked_result\` ADD CONSTRAINT \`FK_3e54da5d7ceb315e386fc3a7158\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`linked_result\` DROP FOREIGN KEY \`FK_3e54da5d7ceb315e386fc3a7158\``);
        await queryRunner.query(`ALTER TABLE \`result_country\` DROP FOREIGN KEY \`FK_5e91e009ff0f7b1266d959d64aa\``);
        await queryRunner.query(`ALTER TABLE \`result_region\` DROP FOREIGN KEY \`FK_5d6f88e9ad16eaaab4cd2ab2a1e\``);
        await queryRunner.query(`ALTER TABLE \`linked_result\` DROP COLUMN \`version_id\``);
        await queryRunner.query(`ALTER TABLE \`result_country\` DROP COLUMN \`version_id\``);
        await queryRunner.query(`ALTER TABLE \`result_region\` DROP COLUMN \`version_id\``);
    }

}
