import { MigrationInterface, QueryRunner } from "typeorm";

export class migrations1677185540996 implements MigrationInterface {
    name = 'migrations1677185540996'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`primary_impact_area\` (\`result_code\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`impact_area_id\` int NOT NULL, \`created_by\` int NULL, \`updated_by\` int NULL, UNIQUE INDEX \`REL_ac891d7c72105e0f340d71d88b\` (\`result_code\`), PRIMARY KEY (\`result_code\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` ADD CONSTRAINT \`FK_ac891d7c72105e0f340d71d88bb\` FOREIGN KEY (\`result_code\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` ADD CONSTRAINT \`FK_7e4c069ea30960e2198a6d35f50\` FOREIGN KEY (\`impact_area_id\`) REFERENCES \`clarisa_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` ADD CONSTRAINT \`FK_a0be1d6ff7588d3fe0f4ba56dec\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` ADD CONSTRAINT \`FK_f2b775b6071a2c11a3e236374e5\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` DROP FOREIGN KEY \`FK_f2b775b6071a2c11a3e236374e5\``);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` DROP FOREIGN KEY \`FK_a0be1d6ff7588d3fe0f4ba56dec\``);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` DROP FOREIGN KEY \`FK_7e4c069ea30960e2198a6d35f50\``);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` DROP FOREIGN KEY \`FK_ac891d7c72105e0f340d71d88bb\``);
        await queryRunner.query(`DROP INDEX \`REL_ac891d7c72105e0f340d71d88b\` ON \`primary_impact_area\``);
        await queryRunner.query(`DROP TABLE \`primary_impact_area\``);
    }

}
