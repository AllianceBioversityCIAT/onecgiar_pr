import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorfkResultCenter1667945215652 implements MigrationInterface {
    name = 'refactorfkResultCenter1667945215652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_center\` (\`code\` varchar(15) NOT NULL, \`financial_code\` text NULL, \`institutionId\` int NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`centerIdCode\` varchar(15) NULL`);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`center_id\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`center_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_center\` ADD CONSTRAINT \`FK_4536fb7f9bc0ad93315b1fddb8c\` FOREIGN KEY (\`institutionId\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_bac1b42a8c25a3348a75593a160\` FOREIGN KEY (\`centerIdCode\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_bac1b42a8c25a3348a75593a160\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_center\` DROP FOREIGN KEY \`FK_4536fb7f9bc0ad93315b1fddb8c\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`center_id\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`center_id\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`centerIdCode\``);
        await queryRunner.query(`DROP TABLE \`clarisa_center\``);
    }

}
