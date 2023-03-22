import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultActors1679499665534 implements MigrationInterface {
    name = 'createResultActors1679499665534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`actor_type\` (\`actor_type_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, PRIMARY KEY (\`actor_type_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_actors\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_actors_id\` bigint NOT NULL AUTO_INCREMENT, \`women\` bigint NULL, \`women_youth\` bigint NULL, \`men\` bigint NULL, \`men_youth\` bigint NULL, \`result_id\` bigint NOT NULL, \`actor_type_id\` bigint NULL, PRIMARY KEY (\`result_actors_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_actors\` ADD CONSTRAINT \`FK_ddf5180b215755556b02fc3dc21\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_actors\` ADD CONSTRAINT \`FK_1e8239f94ef47fc1d5082a6f553\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_actors\` ADD CONSTRAINT \`FK_ac038801c4c7a2d25d9b95f6bd8\` FOREIGN KEY (\`actor_type_id\`) REFERENCES \`actor_type\`(\`actor_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO actor_type (name) VALUES ('Expert on how to improve beneficiary/ user awareness of the core innovation'), ('Expert on how to improve beneficiary/ user confidence/ trust in core innovation'), ('Expert on how to improve  availability and beneficiary/ user access to core innovation'), ('Expert on how to improve  beneficiary/ user access to finance/ affordability of the core innovation'), ('Expert on how to improve  compatibility of core innovation with existing farming/ market/ business systems and models'), ('Expert on how to improve  beneficiary/ user capacity and knowhow to appropriately use the core innovation'), ('Expert on legal conditions and governance required to scale the core innovation (new or improved by-laws, policies, regulations and mechanisms)'), ('Expert on how to improve  stakeholder coordination and partnerships'), ('Other')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_actors\` DROP FOREIGN KEY \`FK_ac038801c4c7a2d25d9b95f6bd8\``);
        await queryRunner.query(`ALTER TABLE \`result_actors\` DROP FOREIGN KEY \`FK_1e8239f94ef47fc1d5082a6f553\``);
        await queryRunner.query(`ALTER TABLE \`result_actors\` DROP FOREIGN KEY \`FK_ddf5180b215755556b02fc3dc21\``);
        await queryRunner.query(`DROP TABLE \`result_actors\``);
        await queryRunner.query(`DROP TABLE \`actor_type\``);
    }

}