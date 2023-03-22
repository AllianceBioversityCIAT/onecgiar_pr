import { MigrationInterface, QueryRunner } from "typeorm";

export class updatedForeignClarisaAAOutcome1679429183629 implements MigrationInterface {
    name = 'updatedForeignClarisaAAOutcome1679429183629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcome\` ADD \`actionAreaId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcome\` ADD CONSTRAINT \`FK_581f5fc010a199b3b706342afdd\` FOREIGN KEY (\`actionAreaId\`) REFERENCES \`clarisa_action_area\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcome\` DROP FOREIGN KEY \`FK_581f5fc010a199b3b706342afdd\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcome\` DROP COLUMN \`actionAreaId\``);
    }

}
