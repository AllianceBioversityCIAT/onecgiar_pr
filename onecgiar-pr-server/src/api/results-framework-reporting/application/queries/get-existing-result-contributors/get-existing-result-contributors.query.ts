import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';

// @akili-spec changes/indicator-reported-results
export class GetExistingResultContributorsToIndicatorsQuery {
  constructor(
    public readonly user: TokenDto,
    public readonly resultTocResultId: string | number,
    public readonly tocResultIndicatorId: string,
    // @akili-spec changes/indicator-reported-results — 'reviewed' (default) | 'all'; unknown values normalised in the handler
    public readonly scope?: string,
  ) {}
}
