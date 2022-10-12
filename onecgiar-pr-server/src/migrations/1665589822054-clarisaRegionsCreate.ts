import { MigrationInterface, QueryRunner } from "typeorm";

export class clarisaRegionsCreate1665589822054 implements MigrationInterface {
    name = 'clarisaRegionsCreate1665589822054'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`FK_9c1808663bdbd6c932fb056e964\` ON \`clarisa_countries_regions\``);
        await queryRunner.query(`CREATE TABLE \`clarisa_regions\` (\`um49Code\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`parent_regions_code\` int NULL, PRIMARY KEY (\`um49Code\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` ADD CONSTRAINT \`FK_f53db7a608c0289defd4e9b33bd\` FOREIGN KEY (\`parent_regions_code\`) REFERENCES \`clarisa_regions\`(\`um49Code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` ADD CONSTRAINT \`FK_e6ce4401446d7eae889e7bef09e\` FOREIGN KEY (\`region_code\`) REFERENCES \`clarisa_regions\`(\`um49Code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` DROP FOREIGN KEY \`FK_e6ce4401446d7eae889e7bef09e\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions\` DROP FOREIGN KEY \`FK_f53db7a608c0289defd4e9b33bd\``);
        await queryRunner.query(`DROP TABLE \`clarisa_regions\``);
        await queryRunner.query(`CREATE INDEX \`FK_9c1808663bdbd6c932fb056e964\` ON \`clarisa_countries_regions\` (\`region_code\`)`);
    }

}
