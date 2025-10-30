export class InnovationResultItemDto {
  id: number;
  result_code: string;
  title: string;
}

export class P22P24GroupDto {
  'innovation-use': InnovationResultItemDto[];
  'innovation-development': InnovationResultItemDto[];
}

export class GetResultsForInnovUseDto {
  P25: InnovationResultItemDto[];
  'P22-P24': P22P24GroupDto[];
}
