// @akili-spec changes/replicated-innovation-reminders (RIR-T-6)
// Mirrors onecgiar-pr-server/src/api/replicated-innovation-reminders/dto/campaign-view.ts. Instants are UTC ISO-8601 strings.

export type ReminderKind = 'Q4_NOTICE' | 'FINAL_REMINDER';
export type ReminderStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface ReminderCampaignView {
  id: number;
  version_id: number;
  kind: ReminderKind;
  scheduled_at: string;
  status: ReminderStatus;
  claimed_at: string | null;
  sent_at: string | null;
  sent_count: number;
  skipped_count: number;
  failed_count: number;
  unreachable_count: number;
  last_error: string | null;
}

export interface ReminderCampaignList {
  phase: { id: number; phase_name: string; phase_year: number };
  campaigns: ReminderCampaignView[];
  pending_total: number;
  unreachable_total: number;
}

export interface ReminderPendingRow {
  result_id: number;
  result_code: number;
  title: string;
  initiative_code: string;
  initiative_short_name: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_contact_person: string | null;
  [key: string]: unknown;
}

export interface ReminderPreview {
  digests: Array<{ to: string; cc: string[]; results: ReminderPendingRow[] }>;
  totals: { leads: number; results: number; cc_addresses: number };
  unreachable: ReminderPendingRow[];
  redirected_to?: string;
}

export interface ReminderSendOutcome {
  status: ReminderStatus | null;
  sent: number;
  skipped: number;
  failed: number;
  unreachable: number;
}

/** Server envelope: payload under `.response`. */
export interface ReminderEnvelope<T> {
  response: T;
  message?: string;
  statusCode?: number;
}

/** Body of POST /campaigns. `scheduled_at` MUST be an ISO-8601 instant with an explicit offset (Z). */
export interface ReminderCreateBody {
  kind: ReminderKind;
  scheduled_at: string;
}
