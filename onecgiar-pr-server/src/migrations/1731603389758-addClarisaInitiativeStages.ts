import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClarisaInitiativeStages1731603389758 implements MigrationInterface {
    name = 'AddClarisaInitiativeStages1731603389758'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_initiative_stages\` (\`id\` bigint NOT NULL, \`stage_id\` int NOT NULL, \`active\` tinyint NOT NULL, \`initiative_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_initiative_stages\` ADD CONSTRAINT \`FK_b0282659945e0fa8fc5c482f43f\` FOREIGN KEY (\`initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_initiative_stages\` DROP FOREIGN KEY \`FK_b0282659945e0fa8fc5c482f43f\``);
        await queryRunner.query(`DROP TABLE \`clarisa_initiative_stages\``);
    }

}
