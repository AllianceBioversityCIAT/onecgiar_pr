// @akili-spec changes/portfolio-overview-feedback-round/contribution-requests-by-pa (CRP-T-3, CRP-DD-4)
import {
  ContributionRequestsByProgram,
  PendingContributionRequest
} from '../../../../../../shared/interfaces/portfolio-contribution-requests.interface';
import { naturalCodeCompare } from '../toc-kpi-block/toc-kpi.format';

const MS_PER_DAY = 86_400_000;

/** CRP-R-6: received Pending, highest first, then P/A code (natural order). Returns a new array. */
export function sortRows(rows: readonly ContributionRequestsByProgram[]): ContributionRequestsByProgram[] {
  return [...rows].sort((a, b) => b.received.pending - a.received.pending || naturalCodeCompare(a.code, b.code));
}

/** CRP-R-4: keeps the selected P/As only. An empty selection keeps every row. Never refetches (CRP-DD-4). */
export function filterByPrograms(rows: readonly ContributionRequestsByProgram[], programs: ReadonlySet<string>): ContributionRequestsByProgram[] {
  return programs.size === 0 ? [...rows] : rows.filter(row => programs.has(row.code));
}

/** CRP-R-2: oldest first. A request with no (or unreadable) date goes last; ties keep request id order. */
export function sortPendingOldestFirst(list: readonly PendingContributionRequest[]): PendingContributionRequest[] {
  const time = (item: PendingContributionRequest): number => {
    const t = item.requestedDate ? Date.parse(item.requestedDate) : NaN;
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };
  return [...list].sort((a, b) => {
    const ta = time(a);
    const tb = time(b);
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.requestId - b.requestId;
  });
}

/** One P/A's pending list: it is the requester OR the approving side (CRP-R-2, CRP-R-4), oldest first. */
export function pendingFor(list: readonly PendingContributionRequest[], code: string): PendingContributionRequest[] {
  return sortPendingOldestFirst(list.filter(item => item.requesterCode === code || item.approvingCode === code));
}

/** Pending list narrowed by the Program filter: a request stays when ANY selected P/A is its requester or approver. */
export function pendingForPrograms(list: readonly PendingContributionRequest[], programs: ReadonlySet<string>): PendingContributionRequest[] {
  const kept =
    programs.size === 0
      ? list
      : list.filter(item => (item.requesterCode !== null && programs.has(item.requesterCode)) || (item.approvingCode !== null && programs.has(item.approvingCode)));
  return sortPendingOldestFirst(kept);
}

/** Whole days between the request date and `now` (never negative); `null` when there is no readable date. */
export function daysWaiting(date: string | null | undefined, now: Date): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / MS_PER_DAY));
}

/** `YYYY-MM-DD` of an ISO date (UTC, so the label never shifts with the viewer zone); `null` when unreadable. */
export function formatRequestedDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const t = Date.parse(date);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}
