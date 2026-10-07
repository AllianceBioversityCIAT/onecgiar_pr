/**
 * @akili-spec notifications/detail-side-panel
 * DSP-R-12, DSP-R-8, design.md §4.1 — response shape for
 * `GET request/get/result/:resultId/approval-chain`. Additive, read-only. Carries only names,
 * codes, dates, statuses and initiative ids — never an email or a user id (DSP-R-12 "Unauthorized
 * viewer" scenario / §7 Security).
 */

export type ApprovalChainSubmissionState = 'submitted' | 'not_submitted';

export type ApprovalChainStepRole = 'primary' | 'contributor';

export type ApprovalChainStepStatus = 'accepted' | 'pending' | 'declined';

export class ApprovalChainSubmissionDto {
  state: ApprovalChainSubmissionState;
  result_status_id: number;
  result_status_name: string;
  actor_name: string | null;
  date: Date | null;
}

export class ApprovalChainStepDto {
  initiative_id: number;
  official_code: string;
  short_name: string;
  name: string;
  role: ApprovalChainStepRole;
  status: ApprovalChainStepStatus;
  actor_name: string | null;
  date: Date | null;
  is_viewer_program: boolean;
}

export class ApprovalChainDto {
  result_id: number;
  submission: ApprovalChainSubmissionDto;
  steps: ApprovalChainStepDto[];
}
