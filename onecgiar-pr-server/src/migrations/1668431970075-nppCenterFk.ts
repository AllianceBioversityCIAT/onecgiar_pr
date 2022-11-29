import { MigrationInterface, QueryRunner } from "typeorm";

export class nppCenterFk1668431970075 implements MigrationInterface {
    name = 'nppCenterFk1668431970075'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_da85bf6616483df2f76bbc85d6b\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP COLUMN \`lead_center_id\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD \`lead_center_id\` varchar(15) NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_da85bf6616483df2f76bbc85d6b\` FOREIGN KEY (\`lead_center_id\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_da85bf6616483df2f76bbc85d6b\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP COLUMN \`lead_center_id\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD \`lead_center_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_da85bf6616483df2f76bbc85d6b\` FOREIGN KEY (\`lead_center_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
