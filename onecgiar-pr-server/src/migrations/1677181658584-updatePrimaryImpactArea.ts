import { MigrationInterface, QueryRunner } from "typeorm";

export class updatePrimaryImpactArea1677181658584 implements MigrationInterface {
    name = 'updatePrimaryImpactArea1677181658584'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` DROP FOREIGN KEY \`FK_1dad31d98c6114f137883331f2d\``);
        await queryRunner.query(`DROP INDEX \`REL_1dad31d98c6114f137883331f2\` ON \`primary_impact_area\``);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` CHANGE \`result_id\` \`result_code\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` ADD UNIQUE INDEX \`IDX_ac891d7c72105e0f340d71d88b\` (\`result_code\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_ac891d7c72105e0f340d71d88b\` ON \`primary_impact_area\` (\`result_code\`)`);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` ADD CONSTRAINT \`FK_ac891d7c72105e0f340d71d88bb\` FOREIGN KEY (\`result_code\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` DROP FOREIGN KEY \`FK_ac891d7c72105e0f340d71d88bb\``);
        await queryRunner.query(`DROP INDEX \`REL_ac891d7c72105e0f340d71d88b\` ON \`primary_impact_area\``);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` DROP INDEX \`IDX_ac891d7c72105e0f340d71d88b\``);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` CHANGE \`result_code\` \`result_id\` bigint NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_1dad31d98c6114f137883331f2\` ON \`primary_impact_area\` (\`result_id\`)`);
        await queryRunner.query(`ALTER TABLE \`primary_impact_area\` ADD CONSTRAINT \`FK_1dad31d98c6114f137883331f2d\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
