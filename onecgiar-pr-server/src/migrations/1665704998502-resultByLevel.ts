import { MigrationInterface, QueryRunner } from "typeorm";

export class resultByLevel1665704998502 implements MigrationInterface {
    name = 'resultByLevel1665704998502'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP FOREIGN KEY \`FK_4b1bdfa8d1881634acd0b2323ad\``);
        await queryRunner.query(`CREATE TABLE \`result_by_level\` (\`id\` int NOT NULL AUTO_INCREMENT, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP COLUMN \`result_level_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`result_level_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_cdbae393c1c7603a7c19c574cb1\` FOREIGN KEY (\`result_level_id\`) REFERENCES \`result_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_cdbae393c1c7603a7c19c574cb1\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`result_level_id\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD \`result_level_id\` int NOT NULL`);
        await queryRunner.query(`DROP TABLE \`result_by_level\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD CONSTRAINT \`FK_4b1bdfa8d1881634acd0b2323ad\` FOREIGN KEY (\`result_level_id\`) REFERENCES \`result_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
