import { MigrationInterface, QueryRunner } from "typeorm";

export class shareResult1669390099226 implements MigrationInterface {
    name = 'shareResult1669390099226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`request_status\` (\`request_status_id\` int NOT NULL AUTO_INCREMENT, \`name\` text NULL, \`description\` text NULL, PRIMARY KEY (\`request_status_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`share_result_request\` (\`share_result_request_id\` int NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`requested_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`aprovaed_date\` timestamp NULL, \`result_id\` bigint NOT NULL, \`owner_initiative_id\` int NOT NULL, \`shared_inititiative_id\` int NOT NULL, \`approving_inititiative_id\` int NOT NULL, \`toc_result_id\` int NULL, \`action_area_outcome_id\` int NULL, \`request_status_id\` int NOT NULL, \`requested_by\` int NOT NULL, \`approved_by\` int NULL, PRIMARY KEY (\`share_result_request_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_0a8dd8be43265221eaf79e3279d\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_ebf0c75b4e36e0ae2960ce3ae62\` FOREIGN KEY (\`owner_initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_f3410ebd0a0328159fca245b00f\` FOREIGN KEY (\`shared_inititiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_c2d6df2d13132546c9a27972443\` FOREIGN KEY (\`approving_inititiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_aaa6305dc4708e5a4366dc8f002\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_f69f0bbffabd027ebfab5eedf26\` FOREIGN KEY (\`action_area_outcome_id\`) REFERENCES \`clarisa_action_area_outcome\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_b34d011edd0bbfaa03f429df48b\` FOREIGN KEY (\`request_status_id\`) REFERENCES \`request_status\`(\`request_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_a22452dbe73365456e8c870bd8c\` FOREIGN KEY (\`requested_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD CONSTRAINT \`FK_0b1c23729cf81b5d0d2bacb3325\` FOREIGN KEY (\`approved_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_0b1c23729cf81b5d0d2bacb3325\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_a22452dbe73365456e8c870bd8c\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_b34d011edd0bbfaa03f429df48b\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_f69f0bbffabd027ebfab5eedf26\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_aaa6305dc4708e5a4366dc8f002\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_c2d6df2d13132546c9a27972443\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_f3410ebd0a0328159fca245b00f\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_ebf0c75b4e36e0ae2960ce3ae62\``);
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP FOREIGN KEY \`FK_0a8dd8be43265221eaf79e3279d\``);
        await queryRunner.query(`DROP TABLE \`share_result_request\``);
        await queryRunner.query(`DROP TABLE \`request_status\``);
    }

}
