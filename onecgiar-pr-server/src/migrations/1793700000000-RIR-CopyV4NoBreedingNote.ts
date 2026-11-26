// @akili-spec changes/rir-breeding-exclusion
import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  RIR_CENTER_TEMPLATE_NAME,
  RIR_FINAL_TEMPLATE_NAME,
  RIR_MELIA_TEMPLATE_NAME,
  RIR_Q4_TEMPLATE_NAME,
  RirTemplateBodies,
  buildRirTemplatesV3,
  buildRirTemplatesV4,
} from '../api/replicated-innovation-reminders/templates/rir-template-copy';

/**
 * SR-167303 — RIR email copy v4: the v3 copy without the breeding paragraph (Nicoleta,
 * 2026-11-26: "I've removed the breeding info in the notifications. B4T manages communication on
 * this topic to centers"). The breeding results stay excluded from the lists
 * (`replicated_innovation_reminder_exclusion`, created by `1793600000000`).
 *
 * `up` rewrites the `template` column of the four RIR rows to v4, BY NAME; `down` restores v3.
 * Re-running either is idempotent (same body written again).
 */
export class RIRCopyV4NoBreedingNote1793700000000
  implements MigrationInterface
{
  name = 'RIRCopyV4NoBreedingNote1793700000000';

  private static readonly TEMPLATE_NAMES = [
    RIR_Q4_TEMPLATE_NAME,
    RIR_FINAL_TEMPLATE_NAME,
    RIR_MELIA_TEMPLATE_NAME,
    RIR_CENTER_TEMPLATE_NAME,
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.writeTemplateBodies(queryRunner, buildRirTemplatesV4());
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.writeTemplateBodies(queryRunner, buildRirTemplatesV3());
  }

  private async writeTemplateBodies(
    queryRunner: QueryRunner,
    bodies: RirTemplateBodies,
  ): Promise<void> {
    for (const name of RIRCopyV4NoBreedingNote1793700000000.TEMPLATE_NAMES) {
      const body = bodies[name];
      if (!body) {
        // An undefined parameter would be written as NULL and wipe the template.
        throw new Error(
          `RIR-CopyV4NoBreedingNote: no body for template "${name}". Nothing was written for it.`,
        );
      }
      await queryRunner.query(
        'UPDATE `template` SET `template` = ?, last_updated_date = CURRENT_TIMESTAMP WHERE name = ?;',
        [body, name],
      );
    }
  }
}
