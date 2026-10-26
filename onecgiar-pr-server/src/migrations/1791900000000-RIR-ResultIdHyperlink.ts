// @akili-spec changes/replicated-innovation-reminders
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * INC-165323 — Result ID as an active hyperlink (Marc Schut, 2026-10-26).
 *
 * In the results table of the RIR templates the Result ID cell becomes a link to the same
 * `{{resultUrl}}` the title already uses (the PRMS result page, general information, of the
 * result's phase). Only the four RIR rows are touched, by name.
 *
 * ## The four futures (repo rule 25)
 *
 *   - Applied without the new code: no code change is needed; the variable already exists.
 *   - Code deployed without applying it: emails keep the plain-text ID.
 *   - Applied twice: REPLACE finds no plain-text cell the second time, so nothing changes.
 *   - Reverted: `down` turns the linked cell back into plain text.
 */
export class RIRResultIdHyperlink1791900000000 implements MigrationInterface {
  name = 'RIRResultIdHyperlink1791900000000';

  private static readonly TEMPLATE_NAMES = [
    'email_template_replicated_innovation_q4_notice',
    'email_template_replicated_innovation_final_reminder',
    'email_template_replicated_innovation_melia_summary',
    'email_template_replicated_innovation_center',
  ];

  private static readonly PLAIN_CELL = '<td>{{resultCode}}</td>';
  private static readonly LINKED_CELL =
    '<td><a class="link" href="{{resultUrl}}">{{resultCode}}</a></td>';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const C = RIRResultIdHyperlink1791900000000;
    await this.replaceInTemplates(queryRunner, C.PLAIN_CELL, C.LINKED_CELL);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const C = RIRResultIdHyperlink1791900000000;
    await this.replaceInTemplates(queryRunner, C.LINKED_CELL, C.PLAIN_CELL);
  }

  /** By name only: never touches a row RIR did not create. */
  private async replaceInTemplates(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    const names = RIRResultIdHyperlink1791900000000.TEMPLATE_NAMES;
    await queryRunner.query(
      `UPDATE \`template\`
          SET \`template\` = REPLACE(\`template\`, ?, ?), last_updated_date = CURRENT_TIMESTAMP
        WHERE name IN (${names.map(() => '?').join(', ')})
          AND INSTR(\`template\`, ?) > 0;`,
      [from, to, ...names, from],
    );
  }
}
