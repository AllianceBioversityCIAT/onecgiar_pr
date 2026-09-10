import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { CreateBilateralDto } from '../dto/create-bilateral.dto';

/**
 * P2-3428 — the status a result is born in when it arrives through the ingestion API.
 *
 * Default is Pending Review: a platform reporting a complete result hands it straight to the
 * Science Program's review queue, which is what every producer did before this existed.
 *
 * `keep_editing: true` means the opposite intent — the platform's user filled in the minimum
 * data set and wants to finish the rest in PRMS. Editing is the same state a centre-authored
 * result starts in (`bilateral-center.service.ts:125`), so these results land in the form the
 * centre already knows, and `submitForReview` — which accepts Editing and Draft — is what
 * eventually moves them to Pending Review.
 *
 * Lives here rather than at the two call sites because there are exactly two: the generic
 * header (`bilateral.service.ts`) and the Knowledge Product handler, which returns its own
 * header and therefore never reaches the generic one. A copy in each is a copy that drifts,
 * and the drift would be silent — KPs quietly ignoring the flag.
 */
export function resolveInitialStatusId(
  bilateralDto: Pick<CreateBilateralDto, 'keep_editing'>,
): number {
  return bilateralDto?.keep_editing === true
    ? ResultStatusData.Editing.value
    : ResultStatusData.PendingReview.value;
}
