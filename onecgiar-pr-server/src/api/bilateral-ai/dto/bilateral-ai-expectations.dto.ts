import { ApiProperty } from '@nestjs/swagger';

/**
 * The two source-mix classes the expectations endpoint accepts (`design.md` §5 "Expectations",
 * `APF-R-6` D) — `documents` when a job carries no audio source, `audio` when it carries any (a
 * document + audio job is `audio`, because audio is what makes it slow). There is no third
 * "mixed" class.
 */
export enum BilateralAiExpectationsMix {
  DOCUMENTS = 'documents',
  AUDIO = 'audio',
}

/**
 * `GET /api/bilateral/center/ai/expectations?mix=documents|audio` response (`design.md` §4.1,
 * `requirements.md` `APF-R-6` D, `APF-R-21`). `p25Minutes`/`p75Minutes` are the P25/P75 of
 * `completed_date - started_date`, in whole minutes, over `COMPLETED` jobs of the same mix class
 * in the last 90 days — `null` when `sampleSize < 5`, never invented from a smaller sample.
 */
export class BilateralAiExpectationsResponseDto {
  @ApiProperty({ enum: BilateralAiExpectationsMix })
  mix: BilateralAiExpectationsMix;

  @ApiProperty({
    description:
      'Count of COMPLETED jobs of this mix class in the last 90 days the range was computed from.',
  })
  sampleSize: number;

  @ApiProperty({
    nullable: true,
    description:
      'P25 of completed_date - started_date, in whole minutes. Null when sampleSize < 5.',
  })
  p25Minutes: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'P75 of completed_date - started_date, in whole minutes. Null when sampleSize < 5.',
  })
  p75Minutes: number | null;
}
