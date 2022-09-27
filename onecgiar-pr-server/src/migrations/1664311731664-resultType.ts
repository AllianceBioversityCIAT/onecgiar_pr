import { MigrationInterface, QueryRunner } from "typeorm";

export class resultType1664311731664 implements MigrationInterface {
    name = 'resultType1664311731664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_87067d6e5348ba4b09bd3c4cb64\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` CHANGE \`id\` \`id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`result_type_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`result_type_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_87067d6e5348ba4b09bd3c4cb64\` FOREIGN KEY (\`result_type_id\`) REFERENCES \`result_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_87067d6e5348ba4b09bd3c4cb64\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`result_type_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`result_type_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD \`id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`result_type\` CHANGE \`id\` \`id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_87067d6e5348ba4b09bd3c4cb64\` FOREIGN KEY (\`result_type_id\`) REFERENCES \`result_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
