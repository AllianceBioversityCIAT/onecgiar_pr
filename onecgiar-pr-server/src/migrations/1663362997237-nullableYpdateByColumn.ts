import { MigrationInterface, QueryRunner } from "typeorm";

export class nullableYpdateByColumn1663362997237 implements MigrationInterface {
    name = 'nullableYpdateByColumn1663362997237'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`update_by\` \`update_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` CHANGE \`update_by\` \`update_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`role\` CHANGE \`update_by\` \`update_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` CHANGE \`update_by\` \`update_by\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` CHANGE \`update_by\` \`update_by\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`role\` CHANGE \`update_by\` \`update_by\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` CHANGE \`update_by\` \`update_by\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`update_by\` \`update_by\` int NOT NULL`);
    }

}
