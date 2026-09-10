import { MigrationInterface, QueryRunner } from 'typeorm';

// @akili-spec changes/mass-reporting-flow
const AI_NARRATIVE_ENABLED_NAME = 'ai_narrative_enabled';
const AI_NARRATIVE_PROMPT_NAME = 'ai_narrative_prompt';

const AI_NARRATIVE_PROMPT_DEFAULT =
  'You are helping a CGIAR reporting focal point summarize progress for {{aow}}. ' +
  'Using the following reporting stats: {{stats}} and the linked high-level outcomes: {{hlos}}, ' +
  'write a concise, plain-language narrative (3-5 sentences) describing what has been reported so far, ' +
  'what remains pending, and how this contributes to the linked high-level outcomes. ' +
  'Avoid jargon, do not invent numbers not present in the stats, and keep a neutral, factual tone.';

export class MRFSeedAiNarrativeParameters1787850000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO global_parameters (name, value, description, global_parameter_category_id)
      VALUES
        (?, '0', 'Enables the AI-generated narrative panel on the By-AOW banner', (SELECT id FROM global_parameter_categories WHERE name = 'platform_global_variables')),
        (?, ?, 'Default prompt template used to generate the AI narrative ({{aow}} {{stats}} {{hlos}} placeholders)', (SELECT id FROM global_parameter_categories WHERE name = 'platform_global_variables'));
      `,
      [
        AI_NARRATIVE_ENABLED_NAME,
        AI_NARRATIVE_PROMPT_NAME,
        AI_NARRATIVE_PROMPT_DEFAULT,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM global_parameters WHERE name IN (?, ?);`,
      [AI_NARRATIVE_ENABLED_NAME, AI_NARRATIVE_PROMPT_NAME],
    );
  }
}
