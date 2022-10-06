import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorRoleByUser1665075627422 implements MigrationInterface {
    name = 'refactorRoleByUser1665075627422'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_8f73e4003e4e30cc916f3005587\``);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` CHANGE \`created_by\` \`created_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_8f73e4003e4e30cc916f3005587\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_8f73e4003e4e30cc916f3005587\``);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` CHANGE \`created_by\` \`created_by\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_8f73e4003e4e30cc916f3005587\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
