import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3096 — Center User schema change (generated via migration:generate, trimmed).
 *
 * TypeORM diff also detected unrelated schema drift; only role_by_user.center_id
 * is included here. After review, add seed/data steps separately if needed:
 *   - INSERT role_levels (Center) + role id=9 → see 1783357000401-SeedCenterUserRole.ts
 *   - UPDATE template email_template_roles_update (new_centers_assigned / revoked_centers)
 */
export class AddCenterUserRoleAndRoleByUserCenterId1783357000400
  implements MigrationInterface
{
  name = 'AddCenterUserRoleAndRoleByUserCenterId1783357000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`role_by_user\` ADD \`center_id\` varchar(15) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_by_user\` ADD CONSTRAINT \`FK_52cc081d4805f68366733a423f6\` FOREIGN KEY (\`center_id\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`role_by_user\` DROP FOREIGN KEY \`FK_52cc081d4805f68366733a423f6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_by_user\` DROP COLUMN \`center_id\``,
    );
  }
}
