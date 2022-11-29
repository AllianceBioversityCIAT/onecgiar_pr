import { MigrationInterface, QueryRunner } from "typeorm";

export class joincolumnResultCenter1667945767259 implements MigrationInterface {
    name = 'joincolumnResultCenter1667945767259'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_bac1b42a8c25a3348a75593a160\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`centerIdCode\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`center_id\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`center_id\` varchar(15) NULL`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_8226c8a3367035d7ec411d6dd54\` FOREIGN KEY (\`center_id\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_8226c8a3367035d7ec411d6dd54\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`center_id\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`center_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`centerIdCode\` varchar(15) NULL`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_bac1b42a8c25a3348a75593a160\` FOREIGN KEY (\`centerIdCode\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
