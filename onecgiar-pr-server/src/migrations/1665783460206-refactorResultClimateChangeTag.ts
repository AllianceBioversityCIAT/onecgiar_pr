import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultClimateChangeTag1665783460206 implements MigrationInterface {
    name = 'refactorResultClimateChangeTag1665783460206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`climate_change_tag_level_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_5529f584fe13fd8fb99b62b8eb2\` FOREIGN KEY (\`climate_change_tag_level_id\`) REFERENCES \`gender_tag_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_5529f584fe13fd8fb99b62b8eb2\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`climate_change_tag_level_id\``);
    }

}
