// @akili-spec changes/rir-breeding-exclusion
import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  RIR_CENTER_TEMPLATE_NAME,
  RIR_FINAL_TEMPLATE_NAME,
  RIR_MELIA_TEMPLATE_NAME,
  RIR_Q4_TEMPLATE_NAME,
  RirTemplateBodies,
  buildRirTemplatesV4,
  buildRirTemplatesV5,
} from '../api/replicated-innovation-reminders/templates/rir-template-copy';

/**
 * SR-167303 — RIR email copy v5: the Center email gives the exact closing date, "on 10 February"
 * instead of "in mid-February" (Nicoleta, 2026-11-27: "Pls make it 10 Feb in the email").
 * The other three bodies are v4 unchanged, so rewriting them is a no-op.
 *
 * `up` rewrites the `template` column of the four RIR rows to v5, BY NAME; `down` restores v4.
 * Re-running either is idempotent (same body written again).
 */
export class RIRCopyV5CenterClosingDate1793800000000
  implements MigrationInterface
{
  name = 'RIRCopyV5CenterClosingDate1793800000000';

  private static readonly TEMPLATE_NAMES = [
    RIR_Q4_TEMPLATE_NAME,
    RIR_FINAL_TEMPLATE_NAME,
    RIR_MELIA_TEMPLATE_NAME,
    RIR_CENTER_TEMPLATE_NAME,
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.writeTemplateBodies(queryRunner, buildRirTemplatesV5());
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.writeTemplateBodies(queryRunner, buildRirTemplatesV4());
  }

  private async writeTemplateBodies(
    queryRunner: QueryRunner,
    bodies: RirTemplateBodies,
  ): Promise<void> {
    for (const name of RIRCopyV5CenterClosingDate1793800000000.TEMPLATE_NAMES) {
      const body = bodies[name];
      if (!body) {
        // An undefined parameter would be written as NULL and wipe the template.
        throw new Error(
          `RIR-CopyV5CenterClosingDate: no body for template "${name}". Nothing was written for it.`,
        );
      }
      await queryRunner.query(
        'UPDATE `template` SET `template` = ?, last_updated_date = CURRENT_TIMESTAMP WHERE name = ?;',
        [body, name],
      );
    }
  }
}
