// @akili-spec changes/replicated-innovation-reminders
// RIR-T-12 (revision 2, design §15.2): pure grouping of pending replicated innovations into
// DEVELOPER digests, MELIA summaries and CENTER emails (RIR-R-2, R-3, R-4, R-17).
// No I/O: the repository (T-11) supplies rows and recipient maps; the dispatcher (T-13) sends.
import { parseDevelopers } from './developer-parser';

/** Flat row returned by PendingInnovationRepository.findPending (revision 1 shape). */
export interface PendingRow {
  result_id: number;
  result_code: number;
  title: string;
  result_type_id: number;
  version_id: number;
  initiative_id: number;
  initiative_code: string;
  initiative_short_name: string | null;
  lead_email: string | null;
  lead_name: string | null;
  lead_contact_person: string | null;
}

/** Pending row of revision 2: adds the bilateral source, developer text and lead center. */
export interface PendingInnovationRowV2 extends PendingRow {
  /** 'API' = bilateral (W3). Anything else, or null, is W1/W2. */
  source: string | null;
  developer_text: string | null;
  lead_center_code: string | null;
  lead_center_name: string | null;
}

export interface MailRecipient {
  name: string | null;
  email: string;
}

export interface BuildInput {
  rows: PendingInnovationRowV2[];
  /** Active PRMS users keyed by lower-cased email (RIR-R-17). */
  activeUsers: Map<string, { name: string }>;
  meliaByInitiative: Map<number, MailRecipient[]>;
  centerMelByCenter: Map<string, MailRecipient[]>;
}

export type ReminderMessageType = 'DEVELOPER' | 'MELIA_SUMMARY' | 'CENTER';

/** What a message or unreachable item exposes of a result: no lead name or address (they are not recipients). */
export type ResultItemBase = Omit<
  PendingRow,
  'lead_email' | 'lead_name' | 'lead_contact_person'
>;

export interface DigestItem extends ResultItemBase {
  developerText: string | null;
}

export interface ReminderMessage {
  type: ReminderMessageType;
  /** DEVELOPER:<email> | MELIA_SUMMARY:<initiative_id> | CENTER:<center code> (design §15.3). */
  messageKey: string;
  to: string[];
  cc: string[];
  greetingName: string;
  results: DigestItem[];
  spCode?: string;
  spName?: string | null;
  centerCode?: string;
  centerName?: string | null;
}

export type UnreachableReason = 'NO_MELIA' | 'NO_CENTER' | 'NO_CENTER_MEL';

export interface UnreachableItem extends ResultItemBase {
  reason: UnreachableReason;
  developer_text: string | null;
  lead_center_code: string | null;
  lead_center_name: string | null;
}

export interface BuildResult {
  messages: ReminderMessage[];
  unreachable: UnreachableItem[];
}

/**
 * RIR-OQ-7 default: Innovation Use (type 2) has no developer field, so it is treated as
 * "no reachable developer" and goes to the MELIA summary of its SP. One constant, one place.
 */
export type InnovationUseRouting = 'MELIA_SUMMARY' | 'UNREACHABLE';
export const INNOVATION_USE_ROUTING: InnovationUseRouting = 'MELIA_SUMMARY';

const INNOVATION_DEVELOPMENT = 7;
const BILATERAL_SOURCE = 'API';
const FALLBACK_GREETING = 'colleague';

const norm = (mail: string | null | undefined): string =>
  (mail ?? '').trim().toLowerCase();

const compareRows = (a: ResultItemBase, b: ResultItemBase): number =>
  (a.initiative_code ?? '').localeCompare(b.initiative_code ?? '', 'en', {
    numeric: true,
  }) ||
  a.result_code - b.result_code ||
  a.result_id - b.result_id;

/** The result fields exposed in messages and unreachable items (drops source, developer text, lead center and the lead's name/address). */
const baseOf = (r: PendingInnovationRowV2): ResultItemBase => ({
  result_id: r.result_id,
  result_code: r.result_code,
  title: r.title,
  result_type_id: r.result_type_id,
  version_id: r.version_id,
  initiative_id: r.initiative_id,
  initiative_code: r.initiative_code,
  initiative_short_name: r.initiative_short_name,
});

const toItem = (r: PendingInnovationRowV2): DigestItem => ({
  ...baseOf(r),
  developerText: r.developer_text ?? null,
});

/** One item per result_id inside a message (rows are already sorted). */
const uniqueItems = (list: PendingInnovationRowV2[]): DigestItem[] => {
  const seen = new Set<number>();
  return list
    .filter((r) => !seen.has(r.result_id) && !!seen.add(r.result_id))
    .map(toItem);
};

/** Deduplicated, lower-cased, sorted addresses of a recipient list. */
const emailsOf = (list: MailRecipient[] | undefined): string[] =>
  [...new Set((list ?? []).map((m) => norm(m.email)).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );

const push = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

const byKey = <V>(map: Map<string, V>): [string, V][] =>
  [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

export function build(
  input: BuildInput,
  innovationUseRouting: InnovationUseRouting = INNOVATION_USE_ROUTING,
): BuildResult {
  const { activeUsers, meliaByInitiative, centerMelByCenter } = input;
  const rows = [...input.rows].sort(compareRows);

  const byDeveloper = new Map<string, PendingInnovationRowV2[]>();
  const noDeveloper: PendingInnovationRowV2[] = [];
  const byCenter = new Map<string, PendingInnovationRowV2[]>();
  const unreachable: UnreachableItem[] = [];

  const unreachableIds = new Set<number>();
  const markUnreachable = (
    r: PendingInnovationRowV2,
    reason: UnreachableReason,
  ): void => {
    // One entry per result, even if the input repeats a row (T-12 advisory A3).
    if (unreachableIds.has(r.result_id)) return;
    unreachableIds.add(r.result_id);
    unreachable.push({
      ...baseOf(r),
      reason,
      developer_text: r.developer_text ?? null,
      lead_center_code: r.lead_center_code ?? null,
      lead_center_name: r.lead_center_name ?? null,
    });
  };

  for (const r of rows) {
    if (r.source === BILATERAL_SOURCE) {
      const code = (r.lead_center_code ?? '').trim();
      if (code) push(byCenter, code, r);
      else markUnreachable(r, 'NO_CENTER');
      continue;
    }

    // W1/W2. This branch covers EVERY result type other than Innovation development (7), i.e.
    // today only Innovation Use (2), which has no developer field: routed by INNOVATION_USE_ROUTING.
    if (r.result_type_id !== INNOVATION_DEVELOPMENT) {
      if (innovationUseRouting === 'MELIA_SUMMARY') noDeveloper.push(r);
      else markUnreachable(r, 'NO_MELIA');
      continue;
    }
    const emails = [
      ...new Set(
        parseDevelopers(r.developer_text)
          .map((d) => d.email)
          .filter((e): e is string => !!e && activeUsers.has(e)),
      ),
    ];
    if (!emails.length) {
      noDeveloper.push(r);
      continue;
    }
    for (const email of emails) push(byDeveloper, email, r);
  }

  const messages: ReminderMessage[] = [];

  for (const [email, list] of byKey(byDeveloper)) {
    const cc = new Set<string>();
    for (const id of new Set(list.map((r) => r.initiative_id))) {
      for (const mail of emailsOf(meliaByInitiative.get(id))) cc.add(mail);
    }
    cc.delete(email);
    const name = (activeUsers.get(email)?.name ?? '').trim();
    messages.push({
      type: 'DEVELOPER',
      messageKey: `DEVELOPER:${email}`,
      to: [email],
      cc: [...cc].sort((a, b) => a.localeCompare(b)),
      greetingName: name || FALLBACK_GREETING,
      results: uniqueItems(list),
    });
  }

  const bySp = new Map<number, PendingInnovationRowV2[]>();
  for (const r of noDeveloper) push(bySp, r.initiative_id, r);
  const spGroups = [...bySp.entries()].sort(([, a], [, b]) =>
    compareRows(a[0], b[0]),
  );
  for (const [initiativeId, list] of spGroups) {
    const to = emailsOf(meliaByInitiative.get(initiativeId));
    if (!to.length) {
      list.forEach((r) => markUnreachable(r, 'NO_MELIA'));
      continue;
    }
    const head = list[0];
    messages.push({
      type: 'MELIA_SUMMARY',
      messageKey: `MELIA_SUMMARY:${initiativeId}`,
      to,
      cc: [],
      greetingName: head.initiative_short_name
        ? `${head.initiative_code} ${head.initiative_short_name}`
        : head.initiative_code,
      results: uniqueItems(list),
      spCode: head.initiative_code,
      spName: head.initiative_short_name,
    });
  }

  for (const [code, list] of byKey(byCenter)) {
    const to = emailsOf(centerMelByCenter.get(code));
    if (!to.length) {
      list.forEach((r) => markUnreachable(r, 'NO_CENTER_MEL'));
      continue;
    }
    const centerName =
      list.find((r) => r.lead_center_name)?.lead_center_name ?? null;
    messages.push({
      type: 'CENTER',
      messageKey: `CENTER:${code}`,
      to,
      cc: [],
      greetingName: centerName || code,
      results: uniqueItems(list),
      centerCode: code,
      centerName,
    });
  }

  return { messages, unreachable: unreachable.sort(compareRows) };
}
