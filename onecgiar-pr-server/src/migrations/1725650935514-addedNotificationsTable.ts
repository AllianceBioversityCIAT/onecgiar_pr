import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedNotificationsTable1725650935514 implements MigrationInterface {
    name = 'AddedNotificationsTable1725650935514'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`notifications_level\` (\`notifications_level_id\` int NOT NULL AUTO_INCREMENT, \`type\` varchar(255) NOT NULL, PRIMARY KEY (\`notifications_level_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notifications_type\` (\`notifications_type_id\` int NOT NULL AUTO_INCREMENT, \`type\` varchar(255) NOT NULL, PRIMARY KEY (\`notifications_type_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notifications\` (\`notification_id\` bigint NOT NULL AUTO_INCREMENT, \`notification_level\` int NOT NULL, \`notification_type\` int NULL, \`target_user\` int NULL, \`emitter_user\` int NULL, \`result_id\` bigint NULL, \`text\` text NULL, \`read\` tinyint NOT NULL DEFAULT 0, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`read_date\` timestamp NULL, PRIMARY KEY (\`notification_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_78ce147bedcff93a9c0c5d96b82\` FOREIGN KEY (\`notification_level\`) REFERENCES \`notifications_level\`(\`notifications_level_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_17dbc728872dae46c72946c06b0\` FOREIGN KEY (\`notification_type\`) REFERENCES \`notifications_type\`(\`notifications_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_5fdec6c5f9c7e06de0e30386a82\` FOREIGN KEY (\`target_user\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_ef66df94009519ca4e88215b6e0\` FOREIGN KEY (\`emitter_user\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_6cf4ea3f81b85cf9d8aa71a9085\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_6cf4ea3f81b85cf9d8aa71a9085\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_ef66df94009519ca4e88215b6e0\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_5fdec6c5f9c7e06de0e30386a82\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_17dbc728872dae46c72946c06b0\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_78ce147bedcff93a9c0c5d96b82\``);
        await queryRunner.query(`DROP TABLE \`notifications\``);
        await queryRunner.query(`DROP TABLE \`notifications_type\``);
        await queryRunner.query(`DROP TABLE \`notifications_level\``);
    }

}
