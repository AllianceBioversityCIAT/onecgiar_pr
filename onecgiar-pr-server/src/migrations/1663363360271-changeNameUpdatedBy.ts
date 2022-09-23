import { MigrationInterface, QueryRunner } from "typeorm";

export class changeNameUpdatedBy1663363360271 implements MigrationInterface {
    name = 'changeNameUpdatedBy1663363360271'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`role\` CHANGE \`update_by\` \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` CHANGE \`update_by\` \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`update_by\` \`updated_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` CHANGE \`update_by\` \`updated_by\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`complementary_data_users\` CHANGE \`updated_by\` \`update_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`updated_by\` \`update_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` CHANGE \`updated_by\` \`update_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`role\` CHANGE \`updated_by\` \`update_by\` int NULL`);
    }

}
