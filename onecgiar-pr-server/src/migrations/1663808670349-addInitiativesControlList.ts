import { MigrationInterface, QueryRunner } from "typeorm";

export class addInitiativesControlList1663808670349 implements MigrationInterface {
    name = 'addInitiativesControlList1663808670349'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_initiatives\` (\`id\` int NOT NULL AUTO_INCREMENT, \`official_code\` text NOT NULL, \`name\` text NOT NULL, \`short_name\` text NOT NULL, \`active\` tinyint NOT NULL, \`action_area_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_initiatives\` ADD CONSTRAINT \`FK_3723eac1ecd7b99a6eae1f74037\` FOREIGN KEY (\`action_area_id\`) REFERENCES \`clarisa_action_area\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_initiatives\` DROP FOREIGN KEY \`FK_3723eac1ecd7b99a6eae1f74037\``);
        await queryRunner.query(`DROP TABLE \`clarisa_initiatives\``);
    }

}
