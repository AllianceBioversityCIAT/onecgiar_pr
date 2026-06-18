import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';

export class GetExistingResultContributorsToIndicatorsQuery {
  constructor(
    public readonly user: TokenDto,
    public readonly resultTocResultId: string | number,
    public readonly tocResultIndicatorId: string,
  ) {}
}
