// @akili-spec changes/portfolio-overview-feedback-round/contribution-requests-by-pa (CRP-T-3)
// Mirrors onecgiar-pr-server/src/api/results-framework-reporting/dto/portfolio-contribution-requests.dto.ts

/** The three request states shared by `totals`, `sent` and `received`. */
export interface ContributionRequestCounts {
  pending: number;
  accepted: number;
  declined: number;
}

/** One Program or Accelerator of the open portfolio (unordered on the wire; zeros included). */
export interface ContributionRequestsByProgram {
  initiativeId: number;
  code: string;
  shortName: string;
  /** Requests this P/A sent as the requester. */
  sent: ContributionRequestCounts;
  /** Requests addressed to this P/A as the approving side (the one that must answer). */
  received: ContributionRequestCounts;
}

/** One request still waiting for an answer. */
export interface PendingContributionRequest {
  requestId: number;
  resultCode: number;
  title: string;
  requesterCode: string | null;
  approvingCode: string | null;
  /** ISO 8601 date, or `null` when unknown. */
  requestedDate: string | null;
}

/** Payload (`response`) of `GET portfolio/contribution-requests`. */
export interface PortfolioContributionRequests {
  versionId: number;
  phaseYear: number;
  /** Each live request of the phase counted once, whatever its P/As. */
  totals: ContributionRequestCounts;
  byProgram: ContributionRequestsByProgram[];
  /** Pending (status 1) only, unordered. */
  pending: PendingContributionRequest[];
}
