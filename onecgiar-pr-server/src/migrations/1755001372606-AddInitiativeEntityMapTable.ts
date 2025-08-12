import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInitiativeEntityMapTable1755001372606 implements MigrationInterface {
    name = 'AddInitiativeEntityMapTable1755001372606'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`initiative_entity_map\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`initiative_id\` int NOT NULL, \`entity_id\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`initiative_entity_map\` ADD CONSTRAINT \`FK_6fc234abc0557230f09e474ee04\` FOREIGN KEY (\`initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`initiative_entity_map\` ADD CONSTRAINT \`FK_75ef17a05a06181730e7b281602\` FOREIGN KEY (\`entity_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`initiative_entity_map\` DROP FOREIGN KEY \`FK_75ef17a05a06181730e7b281602\``);
        await queryRunner.query(`ALTER TABLE \`initiative_entity_map\` DROP FOREIGN KEY \`FK_6fc234abc0557230f09e474ee04\``);
        await queryRunner.query(`DROP TABLE \`initiative_entity_map\``);
    }

}
