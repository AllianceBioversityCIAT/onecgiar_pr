import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorUserDataModel1664307323842 implements MigrationInterface {
    name = 'refactorUserDataModel1664307323842'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`is_cgiar\` \`is_cgiar\` tinyint NOT NULL`);
        await queryRunner.query(`DROP TABLE IF EXISTS \`roles_user_by_aplication\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`complementary_data_users\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`is_cgiar\` \`is_cgiar\` tinyint NULL`);
    }

}
