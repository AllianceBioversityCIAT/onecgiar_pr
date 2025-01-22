import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGlobalNarrativeTable1730150116625 implements MigrationInterface {
    name = 'AddGlobalNarrativeTable1730150116625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`global_narratives\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`value\` text NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_by\` int NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`last_updated_by\` int NULL, UNIQUE INDEX \`IDX_639940fc6935bbbfb174c83897\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`global_narratives\` ADD CONSTRAINT \`FK_16bd07fb9b9dc4237cf2ae143c7\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`global_narratives\` ADD CONSTRAINT \`FK_07548f8fa910d060795036a667c\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`global_narratives\` DROP FOREIGN KEY \`FK_07548f8fa910d060795036a667c\``);
        await queryRunner.query(`ALTER TABLE \`global_narratives\` DROP FOREIGN KEY \`FK_16bd07fb9b9dc4237cf2ae143c7\``);
        await queryRunner.query(`DROP TABLE \`global_narratives\``);
    }

}
