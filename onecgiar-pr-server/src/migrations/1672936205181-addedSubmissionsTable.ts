import { MigrationInterface, QueryRunner } from "typeorm";

export class addedSubmissionsTable1672936205181 implements MigrationInterface {
    name = 'addedSubmissionsTable1672936205181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`submission\` (\`id\` int NOT NULL AUTO_INCREMENT, \`status\` tinyint NOT NULL, \`comment\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`results_id\` bigint NULL, \`user_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`submission\` ADD CONSTRAINT \`FK_dec944ea5d69b6178732a6db2ee\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`submission\` ADD CONSTRAINT \`FK_63b7d5b825e87222fa6a324a92e\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`submission\` DROP FOREIGN KEY \`FK_63b7d5b825e87222fa6a324a92e\``);
        await queryRunner.query(`ALTER TABLE \`submission\` DROP FOREIGN KEY \`FK_dec944ea5d69b6178732a6db2ee\``);
        await queryRunner.query(`DROP TABLE \`submission\``);
    }

}