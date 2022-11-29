import { MigrationInterface, QueryRunner } from "typeorm";

export class resultByLevel1665707526762 implements MigrationInterface {
    name = 'resultByLevel1665707526762'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_level\` ADD \`result_level_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_level\` ADD \`result_type_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_level\` ADD CONSTRAINT \`FK_2ca1b6b07f54acadf9d9beed9f5\` FOREIGN KEY (\`result_level_id\`) REFERENCES \`result_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_by_level\` ADD CONSTRAINT \`FK_e6a5c7c78ff00741eeca4d38eca\` FOREIGN KEY (\`result_type_id\`) REFERENCES \`result_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_level\` DROP FOREIGN KEY \`FK_e6a5c7c78ff00741eeca4d38eca\``);
        await queryRunner.query(`ALTER TABLE \`result_by_level\` DROP FOREIGN KEY \`FK_2ca1b6b07f54acadf9d9beed9f5\``);
        await queryRunner.query(`ALTER TABLE \`result_by_level\` DROP COLUMN \`result_type_id\``);
        await queryRunner.query(`ALTER TABLE \`result_by_level\` DROP COLUMN \`result_level_id\``);
    }

}
