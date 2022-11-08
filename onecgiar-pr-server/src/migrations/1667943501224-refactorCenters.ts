import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorCenters1667943501224 implements MigrationInterface {
    name = 'refactorCenters1667943501224'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_center\` (\`code\` varchar(15) NOT NULL, \`financial_code\` text NULL, \`institutionId\` int NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_center\` ADD CONSTRAINT \`FK_4536fb7f9bc0ad93315b1fddb8c\` FOREIGN KEY (\`institutionId\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP TABLE \`clarisa_center\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_center\` DROP FOREIGN KEY \`FK_4536fb7f9bc0ad93315b1fddb8c\``);
        await queryRunner.query(`DROP TABLE \`clarisa_center\``);
    }

}
