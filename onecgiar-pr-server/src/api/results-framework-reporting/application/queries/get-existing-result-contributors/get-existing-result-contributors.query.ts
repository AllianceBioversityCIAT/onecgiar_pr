import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';

// @akili-spec changes/indicator-reported-results
export class GetExistingResultContributorsToIndicatorsQuery {
  constructor(
    public readonly user: TokenDto,
    public readonly resultTocResultId: string | number,
    public readonly tocResultIndicatorId: string,
    // @akili-spec changes/indicator-reported-results — 'reviewed' (default) | 'all'; unknown values normalised in the handler
    public readonly scope?: string,
    // @akili-spec bugfix/reported-results-center-scoping (RRC-R-3, RRC-DD-4) —
    // optional; omitting it preserves today's coarse related_node_id-only
    // behavior (backward-compatible for any caller mid-rollout).
    public readonly tocIndicatorTargetId?: string | number,
  ) {}
}
