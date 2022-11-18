import { MigrationInterface, QueryRunner } from "typeorm";

export class addingManyToOneRKP1668032076846 implements MigrationInterface {
    name = 'addingManyToOneRKP1668032076846'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_altmetrics\` DROP FOREIGN KEY \`FK_c6d77e362551060f3c0b9079d37\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_altmetrics\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_authors\` DROP FOREIGN KEY \`FK_0b654bf4b5c26049b010a6ec1dd\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_authors\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` DROP FOREIGN KEY \`FK_a8ede7fff5ef7f03fc19466e432\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_metadata\` DROP FOREIGN KEY \`FK_acb6951f3607a9333b8967a1c6b\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_metadata\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_d887f9f657c757413a43c4e491d\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_8f04d42ecd221d17c6ae827d1e0\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_4b90ac3eff7c8506a362680a0e4\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` CHANGE \`predicted_institution_id\` \`predicted_institution_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` CHANGE \`results_by_institutions_id\` \`results_by_institutions_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_altmetrics\` ADD CONSTRAINT \`FK_c6d77e362551060f3c0b9079d37\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_authors\` ADD CONSTRAINT \`FK_0b654bf4b5c26049b010a6ec1dd\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` ADD CONSTRAINT \`FK_a8ede7fff5ef7f03fc19466e432\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_metadata\` ADD CONSTRAINT \`FK_acb6951f3607a9333b8967a1c6b\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_d887f9f657c757413a43c4e491d\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_8f04d42ecd221d17c6ae827d1e0\` FOREIGN KEY (\`predicted_institution_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_4b90ac3eff7c8506a362680a0e4\` FOREIGN KEY (\`results_by_institutions_id\`) REFERENCES \`results_by_institution\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_4b90ac3eff7c8506a362680a0e4\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_8f04d42ecd221d17c6ae827d1e0\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_d887f9f657c757413a43c4e491d\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_metadata\` DROP FOREIGN KEY \`FK_acb6951f3607a9333b8967a1c6b\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` DROP FOREIGN KEY \`FK_a8ede7fff5ef7f03fc19466e432\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_authors\` DROP FOREIGN KEY \`FK_0b654bf4b5c26049b010a6ec1dd\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_altmetrics\` DROP FOREIGN KEY \`FK_c6d77e362551060f3c0b9079d37\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` CHANGE \`results_by_institutions_id\` \`results_by_institutions_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` CHANGE \`predicted_institution_id\` \`predicted_institution_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_4b90ac3eff7c8506a362680a0e4\` FOREIGN KEY (\`results_by_institutions_id\`) REFERENCES \`results_by_institution\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_8f04d42ecd221d17c6ae827d1e0\` FOREIGN KEY (\`predicted_institution_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_d887f9f657c757413a43c4e491d\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_metadata\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_metadata\` ADD CONSTRAINT \`FK_acb6951f3607a9333b8967a1c6b\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` ADD CONSTRAINT \`FK_a8ede7fff5ef7f03fc19466e432\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_authors\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_authors\` ADD CONSTRAINT \`FK_0b654bf4b5c26049b010a6ec1dd\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_altmetrics\` CHANGE \`result_knowledge_product_id\` \`result_knowledge_product_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_kp_altmetrics\` ADD CONSTRAINT \`FK_c6d77e362551060f3c0b9079d37\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
