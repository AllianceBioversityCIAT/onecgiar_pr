import { ApiProperty } from '@nestjs/swagger';

// @akili-spec changes/portfolio-overview-feedback-round/contribution-requests-by-pa (CRP-T-2)

/** The three request states shared by `totals`, `sent` and `received`. */
export class ContributionRequestCountsDto {
  @ApiProperty({ description: 'Requests still waiting for an answer.' })
  pending: number;

  @ApiProperty({ description: 'Requests the approving side accepted.' })
  accepted: number;

  @ApiProperty({ description: 'Requests the approving side declined.' })
  declined: number;
}

/** One Program or Accelerator of the open portfolio. */
export class ContributionRequestsByProgramDto {
  @ApiProperty({ description: 'CLARISA initiative id.' })
  initiativeId: number;

  @ApiProperty({ description: 'CLARISA official code (e.g. SP01, A3).' })
  code: string;

  @ApiProperty({ description: 'Short name of the Program / Accelerator.' })
  shortName: string;

  @ApiProperty({
    description:
      'Contribution requests this Program / Accelerator sent as the requester.',
    type: () => ContributionRequestCountsDto,
  })
  sent: ContributionRequestCountsDto;

  @ApiProperty({
    description:
      'Contribution requests addressed to this Program / Accelerator as the approving side.',
    type: () => ContributionRequestCountsDto,
  })
  received: ContributionRequestCountsDto;
}

/** One request still waiting for an answer. */
export class PendingContributionRequestDto {
  @ApiProperty({ description: 'Share request id.' })
  requestId: number;

  @ApiProperty({ description: 'Result code of the requested result.' })
  resultCode: number;

  @ApiProperty({ description: 'Title of the requested result.' })
  title: string;

  @ApiProperty({
    description: 'Official code of the requesting Program / Accelerator.',
    nullable: true,
    type: String,
  })
  requesterCode: string | null;

  @ApiProperty({
    description: 'Official code of the approving Program / Accelerator.',
    nullable: true,
    type: String,
  })
  approvingCode: string | null;

  @ApiProperty({
    description: 'ISO 8601 date the request was made.',
    nullable: true,
    type: String,
  })
  requestedDate: string | null;
}

/** Payload (`response`) of `GET portfolio/contribution-requests`. */
export class PortfolioContributionRequestsResponseDto {
  @ApiProperty({
    description: 'Reporting version (phase) the figures belong to.',
  })
  versionId: number;

  @ApiProperty({ description: 'Phase year of the version.' })
  phaseYear: number;

  @ApiProperty({
    description:
      'Each live contribution request of the phase counted once, whatever its Programs / Accelerators.',
    type: () => ContributionRequestCountsDto,
  })
  totals: ContributionRequestCountsDto;

  @ApiProperty({
    description:
      'Every active Program and Accelerator of the open portfolio, zeros included. Unordered.',
    type: () => [ContributionRequestsByProgramDto],
  })
  byProgram: ContributionRequestsByProgramDto[];

  @ApiProperty({
    description:
      'Requests still pending (status 1) only, including those whose Programs / Accelerators are outside the open portfolio. Unordered.',
    type: () => [PendingContributionRequestDto],
  })
  pending: PendingContributionRequestDto[];
}
