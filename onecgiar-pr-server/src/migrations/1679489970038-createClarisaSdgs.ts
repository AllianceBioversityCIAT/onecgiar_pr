import { MigrationInterface, QueryRunner } from "typeorm";

export class createClarisaSdgs1679489970038 implements MigrationInterface {
    name = 'createClarisaSdgs1679489970038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_sdgs_targets\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`sdg_target_code\` varchar(5) NOT NULL, \`sdg_target\` text NOT NULL, \`usnd_code\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`clarisa_sdgs\` (\`usnd_code\` bigint NOT NULL AUTO_INCREMENT, \`financial_code\` varchar(400) NOT NULL, \`full_name\` varchar(400) NOT NULL, \`short_name\` varchar(100) NOT NULL, PRIMARY KEY (\`usnd_code\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`clarisa_sdgs\``);
        await queryRunner.query(`DROP TABLE \`clarisa_sdgs_targets\``);
    }

}
