import { MigrationInterface, QueryRunner } from "typeorm";

export class addedDACscoreFields1688661470729 implements MigrationInterface {
    name = 'addedDACscoreFields1688661470729'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`nutrition_tag_level_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`environmental_biodiversity_tag_level_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`poverty_tag_level_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_1be81390e89b7ac007a2131e8e0\` FOREIGN KEY (\`nutrition_tag_level_id\`) REFERENCES \`gender_tag_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_b4919bd92361fdef451a5beba49\` FOREIGN KEY (\`environmental_biodiversity_tag_level_id\`) REFERENCES \`gender_tag_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_9e9efb926c94089911ef3a65bf0\` FOREIGN KEY (\`poverty_tag_level_id\`) REFERENCES \`gender_tag_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_9e9efb926c94089911ef3a65bf0\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_b4919bd92361fdef451a5beba49\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_1be81390e89b7ac007a2131e8e0\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`poverty_tag_level_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`environmental_biodiversity_tag_level_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`nutrition_tag_level_id\``);
    }

}
