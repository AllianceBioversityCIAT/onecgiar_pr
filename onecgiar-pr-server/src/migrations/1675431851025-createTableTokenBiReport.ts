import { MigrationInterface, QueryRunner } from "typeorm";

export class createTableTokenBiReport1675431851025 implements MigrationInterface {
    name = 'createTableTokenBiReport1675431851025'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`token_report_bi\` (\`id\` int NOT NULL AUTO_INCREMENT, \`token_bi\` text NOT NULL, \`expiration_toke_id\` timestamp NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        
    }

}
