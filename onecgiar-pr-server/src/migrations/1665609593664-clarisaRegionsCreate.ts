import { MigrationInterface, QueryRunner } from "typeorm";

export class clarisaRegionsCreate1665609593664 implements MigrationInterface {
    name = 'clarisaRegionsCreate1665609593664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_regions\` (\`um49Code\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`parent_regions_code\` int NULL, PRIMARY KEY (\`um49Code\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`clarisa_countries_regions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`country_id\` int NULL, \`region_code\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` ADD CONSTRAINT \`FK_f53db7a608c0289defd4e9b33bd\` FOREIGN KEY (\`parent_regions_code\`) REFERENCES \`clarisa_regions\`(\`um49Code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` ADD CONSTRAINT \`FK_1aa06ba82f6e1560f3a909dcb6e\` FOREIGN KEY (\`country_id\`) REFERENCES \`clarisa_countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` ADD CONSTRAINT \`FK_e6ce4401446d7eae889e7bef09e\` FOREIGN KEY (\`region_code\`) REFERENCES \`clarisa_regions\`(\`um49Code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` DROP FOREIGN KEY \`FK_e6ce4401446d7eae889e7bef09e\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` DROP FOREIGN KEY \`FK_1aa06ba82f6e1560f3a909dcb6e\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` DROP FOREIGN KEY \`FK_f53db7a608c0289defd4e9b33bd\``);
        await queryRunner.query(`DROP TABLE \`clarisa_countries_regions\``);
        await queryRunner.query(`DROP TABLE \`clarisa_regions\``);
    }

}
