import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorExpertName1679493839844 implements MigrationInterface {
    name = 'refactorExpertName1679493839844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`innovation_packaging_expert\``);
        await queryRunner.query(`CREATE TABLE \`result_ip_expert\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_expert_id\` bigint NOT NULL AUTO_INCREMENT, \`first_name\` text NOT NULL, \`last_name\` text NOT NULL, \`email\` text NOT NULL, \`organization_id\` int NOT NULL, \`expertises_id\` bigint NOT NULL, \`result_id\` bigint NOT NULL, PRIMARY KEY (\`result_ip_expert_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_bc7982d7c0734d1bb55a6b30a74\` FOREIGN KEY (\`expertises_id\`) REFERENCES \`expertises\`(\`expertises_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_a1b1bef8267aa7ae1232f61d144\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_07380999ca22f426019285b1cbf\` FOREIGN KEY (\`organization_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_7f74a18608e02b851a6389a810d\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_7f74a18608e02b851a6389a810d\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_07380999ca22f426019285b1cbf\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_a1b1bef8267aa7ae1232f61d144\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_bc7982d7c0734d1bb55a6b30a74\``);
        await queryRunner.query(`DROP TABLE \`result_ip_expert\``);
    }

}
