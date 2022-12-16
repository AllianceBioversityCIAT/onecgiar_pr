import { MigrationInterface, QueryRunner } from "typeorm";

export class addValidationTable1671196959348 implements MigrationInterface {
    name = 'addValidationTable1671196959348'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`validation\` (\`id\` int NOT NULL AUTO_INCREMENT, \`section_seven\` tinyint NULL, \`general_information\` tinyint NULL, \`theory_of_change\` tinyint NULL, \`partners\` tinyint NULL, \`geographic_location\` tinyint NULL, \`links_to_results\` tinyint NULL, \`evidence\` tinyint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`validation\``);
    }

}
