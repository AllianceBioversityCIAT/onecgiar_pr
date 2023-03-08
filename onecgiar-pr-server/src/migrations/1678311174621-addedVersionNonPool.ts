import { MigrationInterface, QueryRunner } from "typeorm";

export class addedVersionNonPool1678311174621 implements MigrationInterface {
    name = 'addedVersionNonPool1678311174621'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD \`version_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_2c75f37a5180edcc80c3da36df2\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_2c75f37a5180edcc80c3da36df2\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP COLUMN \`version_id\``);
    }

}
