import { MigrationInterface, QueryRunner } from "typeorm";

export class addTablesPolicyTypeAndUsTages1668822551501 implements MigrationInterface {
    name = 'addTablesPolicyTypeAndUsTages1668822551501'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_policy_type\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NULL, \`definition\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`clarisa_policy_type\``);
    }

}
