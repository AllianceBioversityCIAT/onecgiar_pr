/**
 * NOTIF-T-1 — Unified notification list (merge + classify).
 *
 * Merges the three existing, unchanged data sources (Received requests, Sent requests, Updates)
 * into one presentational array, per `docs/specs/notifications/inbox-revamp/design.md` §6.2
 * (`NOTIF-DD-1`). This is a pure, presentation-layer merge — no HTTP calls, no mutation of the
 * inputs — so it is extracted from `results-notifications.service.ts` rather than added to it
 * (that service is already ~330 lines covering several unrelated concerns).
 *
 * Classification (`NOTIF-P-1`, verified against `notification-item.component.ts::get isPending()`):
 * a row "needs a decision" iff it is a Received (not Sent) row with `request_status_id === 1`.
 * Since Received/Sent already arrive as separate arrays, "not sent" is simply "came from the
 * `received` array" — Sent rows are always `needsDecision: false` regardless of their status.
 * Updates rows are always informational (`needsDecision: false`).
 *
 * `activityDate` is normalized so `group-notifications-by-recency` (NOTIF-T-2) can bucket the
 * merged list with one `dateKey`: Requests-tab rows (Received + Sent) use `requested_date`,
 * Updates-tab rows use `created_date` (`NOTIF-P-2`).
 */

export type NotificationSource = 'request' | 'update';

/**
 * NOTIF-T-6 (Pivot re-scope, `NOTIF-DD-6`): a true Received-vs-Sent discriminator. `source` alone
 * cannot tell a resolved Received row apart from a Sent row (both are `source:'request'` with
 * `needsDecision:false`) — the Received/Sent in-list toggle needs a real per-row origin, not the
 * `needsDecision`-based proxy `isSentRow()` used until now (which happens to be safe for gating
 * `isPending` but is not a genuine identity). Minimal, additive field — nothing existing reads it.
 */
export type NotificationOrigin = 'received' | 'sent' | 'update';

export interface UnifiedNotification extends Record<string, unknown> {
  /** 'request' for Received/Sent rows, 'update' for Updates rows. */
  source: NotificationSource;
  /** true only for a Received, pending (`request_status_id === 1`) row — NOTIF-P-1. */
  needsDecision: boolean;
  /** `requested_date` for Requests-tab rows, `created_date` for Updates-tab rows. */
  activityDate: string | undefined;
  /** Which of the three source arrays this row came from — see `NotificationOrigin`. */
  origin: NotificationOrigin;
}

function tagRequestRow<T extends Record<string, unknown>>(
  row: T,
  needsDecision: boolean,
  origin: 'received' | 'sent'
): UnifiedNotification {
  return {
    ...row,
    source: 'request',
    needsDecision,
    origin,
    activityDate: row?.['requested_date'] as string | undefined
  };
}

function tagUpdateRow<T extends Record<string, unknown>>(row: T): UnifiedNotification {
  return {
    ...row,
    source: 'update',
    needsDecision: false,
    origin: 'update',
    activityDate: row?.['created_date'] as string | undefined
  };
}

/**
 * @param received Received requests (pending + resolved) — `request/get/received`.
 * @param sent Sent requests — `request/get/sent`. Always informational.
 * @param updates Informational feed — `notification/updates`. Always informational.
 */
export function buildUnifiedList<T extends Record<string, unknown>>(
  received: T[] = [],
  sent: T[] = [],
  updates: T[] = []
): UnifiedNotification[] {
  const receivedRows = (received ?? []).map(row => tagRequestRow(row, row?.['request_status_id'] === 1, 'received'));
  const sentRows = (sent ?? []).map(row => tagRequestRow(row, false, 'sent'));
  const updateRows = (updates ?? []).map(row => tagUpdateRow(row));

  return [...receivedRows, ...sentRows, ...updateRows];
}
