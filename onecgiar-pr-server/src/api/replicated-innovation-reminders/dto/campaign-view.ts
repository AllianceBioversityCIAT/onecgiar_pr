// @akili-spec changes/replicated-innovation-reminders
import {
  DigestItem,
  ReminderMessage,
  ReminderMessageType,
  UnreachableItem,
} from '../digest-builder';
import {
  ReplicatedInnovationReminderCampaign,
  ReplicatedReminderKind,
  ReplicatedReminderStatus,
} from '../entities/replicated-innovation-reminder-campaign.entity';
import { DispatchOutcome } from '../reminder-dispatcher.service';

/** What the admin UI sees of a campaign (`RIR-R-15`). Instants are UTC ISO-8601 strings. */
export interface CampaignView {
  id: number;
  version_id: number;
  kind: ReplicatedReminderKind;
  scheduled_at: string;
  status: ReplicatedReminderStatus;
  claimed_at: string | null;
  sent_at: string | null;
  sent_count: number;
  skipped_count: number;
  failed_count: number;
  unreachable_count: number;
  last_error: string | null;
}

export interface CampaignListView {
  phase: { id: number; phase_name: string; phase_year: number };
  campaigns: CampaignView[];
  pending_total: number;
  unreachable_total: number;
}

/** One message of the preview, grouped by `type` in the UI (RIR-R-9, design §15.4). */
export interface PreviewMessageView {
  type: ReminderMessageType;
  /** Exactly-once key (DEVELOPER:<email> | MELIA_SUMMARY:<sp id> | CENTER:<code>). */
  message_key: string;
  to: string[];
  cc: string[];
  greeting: string;
  results: DigestItem[];
  /** MELIA_SUMMARY only. */
  sp_code?: string;
  sp_name?: string | null;
  /** CENTER only. */
  center_code?: string;
  center_name?: string | null;
}

export interface PreviewTypeTotals {
  messages: number;
  results: number;
}

export interface PreviewTotals {
  /** Overall number of messages (= emails). */
  messages: number;
  /** Overall number of listed results (a result in two digests counts twice). */
  results: number;
  /** Distinct CC addresses across all messages. */
  cc_addresses: number;
  by_type: Record<ReminderMessageType, PreviewTypeTotals>;
}

export interface PreviewView {
  /** Name kept from revision 1; holds every message type. */
  digests: PreviewMessageView[];
  totals: PreviewTotals;
  /** Carries `reason`, `developer_text`, `lead_center_code`, `lead_center_name` plus the result fields. */
  unreachable: UnreachableItem[];
  redirected_to?: string;
}

export interface SendView {
  status: ReplicatedReminderStatus | null;
  sent: number;
  skipped: number;
  failed: number;
  unreachable: number;
  /** Sent counts of this run per message type (the campaign table only stores totals). */
  sent_by_type: Record<ReminderMessageType, number>;
}

const iso = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

export function toCampaignView(
  c: ReplicatedInnovationReminderCampaign,
): CampaignView {
  return {
    id: Number(c.id),
    version_id: Number(c.version_id),
    kind: c.kind,
    scheduled_at: iso(c.scheduled_at),
    status: c.status,
    claimed_at: iso(c.claimed_at),
    sent_at: iso(c.sent_at),
    sent_count: c.sent_count,
    skipped_count: c.skipped_count,
    failed_count: c.failed_count,
    unreachable_count: c.unreachable_count,
    last_error: c.last_error,
  };
}

const MESSAGE_TYPES: ReminderMessageType[] = [
  'DEVELOPER',
  'MELIA_SUMMARY',
  'CENTER',
];

const toMessageView = (m: ReminderMessage): PreviewMessageView => ({
  type: m.type,
  message_key: m.messageKey,
  to: m.to,
  cc: m.cc,
  greeting: m.greetingName,
  results: m.results,
  ...(m.spCode !== undefined
    ? { sp_code: m.spCode, sp_name: m.spName ?? null }
    : {}),
  ...(m.centerCode !== undefined
    ? { center_code: m.centerCode, center_name: m.centerName ?? null }
    : {}),
});

export function toPreviewView(outcome: DispatchOutcome): PreviewView {
  const messages: ReminderMessage[] = outcome.messages ?? [];
  const cc = new Set<string>();
  messages.forEach((m) => m.cc.forEach((a) => cc.add(a)));
  const by_type = Object.fromEntries(
    MESSAGE_TYPES.map((type) => {
      const own = messages.filter((m) => m.type === type);
      return [
        type,
        {
          messages: own.length,
          results: own.reduce((n, m) => n + m.results.length, 0),
        },
      ];
    }),
  ) as Record<ReminderMessageType, PreviewTypeTotals>;
  return {
    digests: messages.map(toMessageView),
    totals: {
      messages: messages.length,
      results: messages.reduce((n, m) => n + m.results.length, 0),
      cc_addresses: cc.size,
      by_type,
    },
    unreachable: outcome.unreachableRows ?? [],
    ...(outcome.redirectedTo ? { redirected_to: outcome.redirectedTo } : {}),
  };
}

export function toSendView(outcome: DispatchOutcome): SendView {
  return {
    status: outcome.status,
    sent: outcome.sent,
    skipped: outcome.skipped,
    failed: outcome.failed,
    unreachable: outcome.unreachable,
    sent_by_type: outcome.sentByType,
  };
}
