import { MigrationInterface, QueryRunner } from "typeorm";

export class removedUnkwonUsingColumnCapSharing1701271381277 implements MigrationInterface {
    name = 'removedUnkwonUsingColumnCapSharing1701271381277'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`unkown_using\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`unkown_using\` tinyint NULL`);
    }

}
