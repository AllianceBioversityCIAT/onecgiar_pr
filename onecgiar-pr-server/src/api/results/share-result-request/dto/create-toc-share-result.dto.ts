import { ApiProperty } from '@nestjs/swagger';
import { ContributorResultTocResult } from '../../results-toc-results/dto/create-results-toc-result.dto';

export class CreateTocShareResult {
  @ApiProperty({
    description: 'Array of initiative share IDs associated with the result',
    example: [1, 2, 3],
  })
  public initiativeShareId: number[];

  @ApiProperty({
    required: false,
    description:
      'Optional map of initiative id to from_toc flag for share requests.',
    example: { 50: true, 61: false },
  })
  public initiativeFromToc?: Record<number, boolean>;

  @ApiProperty({
    description: 'Indicates if this is part of the Theory of Change (ToC)',
    example: true,
  })
  public isToc: boolean;

  @ApiProperty({
    description: 'Optional email template to use for notifications',
    example: 'template1',
    required: false,
  })
  public email_template?: string;

  @ApiProperty({ type: () => [ContributorResultTocResult], required: false })
  contributors_result_toc_result?: ContributorResultTocResult[];
}
