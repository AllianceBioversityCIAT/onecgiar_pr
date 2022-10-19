import { MigrationInterface, QueryRunner } from "typeorm";

export class clarisaInstitutionstype1666109363586 implements MigrationInterface {
    name = 'clarisaInstitutionstype1666109363586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_c487f2dfe9069367da65076d0c4\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`institution_types\``);
        await queryRunner.query(`CREATE TABLE \`clarisa_institution_types\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`acronym\` text NULL, \`sub_department_active\` int NOT NULL, \`old\` int NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_c487f2dfe9069367da65076d0c4\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`clarisa_institution_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_c487f2dfe9069367da65076d0c4\``);
        await queryRunner.query(`DROP TABLE \`clarisa_institution_types\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_c487f2dfe9069367da65076d0c4\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`institution_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
