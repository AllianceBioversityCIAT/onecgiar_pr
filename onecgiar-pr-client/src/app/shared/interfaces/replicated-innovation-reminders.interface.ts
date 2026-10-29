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

export type ReminderMessageType = 'DEVELOPER' | 'MELIA_SUMMARY' | 'CENTER';
export type ReminderUnreachableReason = 'NO_MELIA' | 'NO_CENTER' | 'NO_CENTER_MEL';

/** Fields shared by every pending result row (RIR-T-13 contract). */
export interface ReminderPendingRow {
  result_id: number;
  result_code: number;
  title: string;
  result_type_id: number;
  version_id: number;
  initiative_id: number;
  initiative_code: string;
  initiative_short_name: string | null;
}

export interface ReminderDigestItem extends ReminderPendingRow {
  developerText: string | null;
}

export interface ReminderUnreachableItem extends ReminderPendingRow {
  reason: ReminderUnreachableReason;
  developer_text: string | null;
  lead_center_code: string | null;
  lead_center_name: string | null;
}

export interface ReminderPreviewMessage {
  type: ReminderMessageType;
  message_key: string;
  to: string[];
  cc: string[];
  greeting: string;
  results: ReminderDigestItem[];
  sp_code?: string;
  sp_name?: string | null;
  center_code?: string;
  center_name?: string | null;
}

export interface ReminderPreview {
  digests: ReminderPreviewMessage[];
  totals: {
    messages: number;
    results: number;
    cc_addresses: number;
    by_type: Record<ReminderMessageType, { messages: number; results: number }>;
  };
  unreachable: ReminderUnreachableItem[];
  redirected_to?: string;
}

export interface ReminderSendOutcome {
  status: ReminderStatus | null;
  sent: number;
  skipped: number;
  failed: number;
  unreachable: number;
  sent_by_type: Record<ReminderMessageType, number>;
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
