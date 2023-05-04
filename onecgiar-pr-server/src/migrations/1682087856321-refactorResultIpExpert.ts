import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultIpExpert1682087856321 implements MigrationInterface {
    name = 'refactorResultIpExpert1682087856321'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_07380999ca22f426019285b1cbf\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`first_name\` \`first_name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`last_name\` \`last_name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`email\` \`email\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`organization_id\` \`organization_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_07380999ca22f426019285b1cbf\` FOREIGN KEY (\`organization_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_07380999ca22f426019285b1cbf\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`organization_id\` \`organization_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`email\` \`email\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`last_name\` \`last_name\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` CHANGE \`first_name\` \`first_name\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_07380999ca22f426019285b1cbf\` FOREIGN KEY (\`organization_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
