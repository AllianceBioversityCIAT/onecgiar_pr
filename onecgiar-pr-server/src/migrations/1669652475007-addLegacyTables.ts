import { MigrationInterface, QueryRunner } from "typeorm";

export class addLegacyTables1669652475007 implements MigrationInterface {
    name = 'addLegacyTables1669652475007'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`legacy_indicators_partners\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`year\` int NULL, \`name\` mediumtext NULL, \`acronym\` varchar(45) NULL, \`legacy_id\` varchar(45) NULL, \`clarisa_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`legacy_indicators_locations\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`year\` int NULL, \`type\` varchar(7) NOT NULL DEFAULT '', \`country_id\` varchar(23) NULL, \`legacy_id\` varchar(45) NULL, \`iso_alpha_2\` varchar(5) NULL, \`um49_code\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_partners\` ADD CONSTRAINT \`FK_dac7cc88ef0602ab78d901f6da0\` FOREIGN KEY (\`legacy_id\`) REFERENCES \`legacy_result\`(\`legacy_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_partners\` ADD CONSTRAINT \`FK_37ae1df5169e44aebae8c270feb\` FOREIGN KEY (\`clarisa_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_locations\` ADD CONSTRAINT \`FK_9314f3b4bb371eaafc9de715114\` FOREIGN KEY (\`legacy_id\`) REFERENCES \`legacy_result\`(\`legacy_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_locations\` ADD CONSTRAINT \`FK_a211fb1925a3b93ad80c2bca5ba\` FOREIGN KEY (\`iso_alpha_2\`) REFERENCES \`clarisa_countries\`(\`iso_alpha_2\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_locations\` ADD CONSTRAINT \`FK_26b7bb6355c9e769bbecaf994eb\` FOREIGN KEY (\`um49_code\`) REFERENCES \`clarisa_regions\`(\`um49Code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_locations\` DROP FOREIGN KEY \`FK_26b7bb6355c9e769bbecaf994eb\``);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_locations\` DROP FOREIGN KEY \`FK_a211fb1925a3b93ad80c2bca5ba\``);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_locations\` DROP FOREIGN KEY \`FK_9314f3b4bb371eaafc9de715114\``);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_partners\` DROP FOREIGN KEY \`FK_37ae1df5169e44aebae8c270feb\``);
        await queryRunner.query(`ALTER TABLE \`legacy_indicators_partners\` DROP FOREIGN KEY \`FK_dac7cc88ef0602ab78d901f6da0\``);
        await queryRunner.query(`DROP TABLE \`legacy_indicators_locations\``);
        await queryRunner.query(`DROP TABLE \`legacy_indicators_partners\``);
    }

}
