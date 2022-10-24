import { MigrationInterface, QueryRunner } from "typeorm";

export class addInnovationTables1666385817169 implements MigrationInterface {
    name = 'addInnovationTables1666385817169'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_innovation_type\` (\`code\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`definition\` text NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`clarisa_innovation_readiness_level\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`definition\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`clarisa_innovation_characteristic\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`definition\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`clarisa_policy_stage\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`definition\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`clarisa_policy_stage\``);
        await queryRunner.query(`DROP TABLE \`clarisa_innovation_characteristic\``);
        await queryRunner.query(`DROP TABLE \`clarisa_innovation_readiness_level\``);
        await queryRunner.query(`DROP TABLE \`clarisa_innovation_type\``);
    }

}
