import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInnovationUseLevels1683295139953 implements MigrationInterface {
    name = 'CreateInnovationUseLevels1683295139953'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_innovation_use_levels\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`clarisa_innovation_use_levels\``);
    }

}
