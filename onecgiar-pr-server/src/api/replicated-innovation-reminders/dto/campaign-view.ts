// @akili-spec changes/replicated-innovation-reminders
import { Digest, PendingRow } from '../digest-builder';
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

export interface PreviewView {
  digests: Array<{ to: string; cc: string[]; results: PendingRow[] }>;
  totals: { leads: number; results: number; cc_addresses: number };
  unreachable: PendingRow[];
  redirected_to?: string;
}

export interface SendView {
  status: ReplicatedReminderStatus | null;
  sent: number;
  skipped: number;
  failed: number;
  unreachable: number;
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

export function toPreviewView(outcome: DispatchOutcome): PreviewView {
  const digests: Digest[] = outcome.digests ?? [];
  const cc = new Set<string>();
  digests.forEach((d) => d.cc.forEach((a) => cc.add(a)));
  return {
    digests: digests.map((d) => ({ to: d.to, cc: d.cc, results: d.results })),
    totals: {
      leads: digests.length,
      results: digests.reduce((n, d) => n + d.results.length, 0),
      cc_addresses: cc.size,
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
  };
}
