import { MigrationInterface, QueryRunner } from "typeorm";

export class resultQuestionTables1692129047987 implements MigrationInterface {
    name = 'resultQuestionTables1692129047987'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_answers\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_answer_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`result_question_id\` bigint NOT NULL, \`answer_text\` text NULL, \`answer_boolean\` tinyint NULL, PRIMARY KEY (\`result_answer_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_question_types\` (\`result_question_type_id\` bigint NOT NULL AUTO_INCREMENT, \`type_description\` text NOT NULL, PRIMARY KEY (\`result_question_type_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_questions\` (\`result_question_id\` bigint NOT NULL AUTO_INCREMENT, \`question_text\` text NULL, \`question_description\` text NULL, \`result_type_id\` int NOT NULL, \`parent_question_id\` bigint NULL, \`question_type_id\` bigint NOT NULL, \`question_level\` bigint NULL, PRIMARY KEY (\`result_question_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_answers\` ADD CONSTRAINT \`FK_dde08224c02bf6d8ec6872aff0b\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_answers\` ADD CONSTRAINT \`FK_0e464921d9c03466a50248827c4\` FOREIGN KEY (\`result_question_id\`) REFERENCES \`result_questions\`(\`result_question_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_questions\` ADD CONSTRAINT \`FK_8942b666a92b3e44658e715dcf5\` FOREIGN KEY (\`result_type_id\`) REFERENCES \`result_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_questions\` ADD CONSTRAINT \`FK_f52ac8c6a763acb79d4a08ab50c\` FOREIGN KEY (\`parent_question_id\`) REFERENCES \`result_questions\`(\`result_question_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_questions\` DROP FOREIGN KEY \`FK_f52ac8c6a763acb79d4a08ab50c\``);
        await queryRunner.query(`ALTER TABLE \`result_questions\` DROP FOREIGN KEY \`FK_8942b666a92b3e44658e715dcf5\``);
        await queryRunner.query(`ALTER TABLE \`result_answers\` DROP FOREIGN KEY \`FK_0e464921d9c03466a50248827c4\``);
        await queryRunner.query(`ALTER TABLE \`result_answers\` DROP FOREIGN KEY \`FK_dde08224c02bf6d8ec6872aff0b\``);
        await queryRunner.query(`DROP TABLE \`result_questions\``);
        await queryRunner.query(`DROP TABLE \`result_question_types\``);
        await queryRunner.query(`DROP TABLE \`result_answers\``);
    }

}
