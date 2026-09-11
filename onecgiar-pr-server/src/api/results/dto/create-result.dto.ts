import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResultDto {
  @ApiProperty({ description: 'Initiative identifier that owns the result.' })
  public initiative_id: number;

  @ApiProperty({
    description: 'Type identifier describing the result category.',
  })
  public result_type_id: number;

  @ApiProperty({ description: 'Level identifier associated with the result.' })
  public result_level_id: number;

  @ApiProperty({ description: 'Public title or name for the result.' })
  public result_name!: string;

  @ApiProperty({
    description: 'Friendly handler used to reference the result.',
  })
  public handler!: string;

  /**
   * P2-3420 / P2-3421 — answer to "Are you reporting the use of an innovation that has already been
   * reported and quality assessed?", asked on both W1/W2 Innovation Use creation surfaces.
   *
   * 🛑 It travels INSIDE the create on purpose. Chaining the innovation-use PATCH right after
   * creating the result does NOT work: `innovation-use.service.ts` rejects the call without a valid
   * `innovation_use_level_id`, and a brand-new result has none yet.
   *
   * Stored where the Contributors & Partners section already stores it
   * (`results_innovations_use.has_innovation_link` + the `linked_result` table), so the user finds
   * the answer already ticked there and edits it in that single home — no second question anywhere.
   */
  @ApiPropertyOptional({
    description:
      "Whether this Innovation Use result links to an already reported, QA'd Innovation Development result.",
  })
  public has_innovation_link?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Ids of the linked results. The UI caps this at one, but the storage is a list because Contributors & Partners allows several.',
  })
  public linked_results?: number[];
}
