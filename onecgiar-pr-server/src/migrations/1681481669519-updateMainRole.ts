import { MigrationInterface, QueryRunner } from "typeorm"

export class updateMainRole1681481669519 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        update non_pooled_project 
	        set non_pooled_project_type_id = 1;
        `);

        await queryRunner.query(`
        update evidence  
	        set evidence_type_id = 1;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
