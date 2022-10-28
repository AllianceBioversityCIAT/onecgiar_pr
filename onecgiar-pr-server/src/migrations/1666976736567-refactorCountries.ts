import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorCountries1666976736567 implements MigrationInterface {
    name = 'refactorCountries1666976736567'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`headquarter_country_iso2\` varchar(5) NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` DROP COLUMN \`iso_alpha_2\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` ADD \`iso_alpha_2\` varchar(5) NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` ADD UNIQUE INDEX \`IDX_4ea24ca2df0eee8206c45aa065\` (\`iso_alpha_2\`)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_59d96103953820802de1dd60065\` FOREIGN KEY (\`headquarter_country_iso2\`) REFERENCES \`clarisa_countries\`(\`iso_alpha_2\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_59d96103953820802de1dd60065\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` DROP INDEX \`IDX_4ea24ca2df0eee8206c45aa065\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` DROP COLUMN \`iso_alpha_2\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` ADD \`iso_alpha_2\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`headquarter_country_iso2\``);
    }

}
