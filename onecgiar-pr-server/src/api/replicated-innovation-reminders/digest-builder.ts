// @akili-spec changes/replicated-innovation-reminders
// Pure grouping of pending replicated innovations into one digest per lead (RIR-R-2, R-3, R-4).
// No I/O: the repository (RIR-T-2) supplies the rows and the CC map.

/** Flat row returned by PendingInnovationRepository.findPending. */
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

/** CC addresses (coordinators + MELIA) keyed by initiative id. */
export type CcByInitiative = Map<number, string[]>;

export interface Digest {
  to: string;
  lead_name: string | null;
  cc: string[];
  results: PendingRow[];
}

export interface DigestBuildResult {
  digests: Digest[];
  unreachable: PendingRow[];
}

const norm = (mail: string | null | undefined): string =>
  (mail ?? '').trim().toLowerCase();

const compareRows = (a: PendingRow, b: PendingRow): number =>
  (a.initiative_code ?? '').localeCompare(b.initiative_code ?? '', 'en', {
    numeric: true,
  }) ||
  a.result_code - b.result_code ||
  a.result_id - b.result_id;

export function buildDigests(
  rows: PendingRow[],
  ccByInitiative: CcByInitiative,
): DigestBuildResult {
  const groups = new Map<string, PendingRow[]>();
  const unreachable: PendingRow[] = [];

  for (const r of rows) {
    const to = norm(r.lead_email);
    if (!to) {
      unreachable.push(r);
      continue;
    }
    const list = groups.get(to);
    if (list) list.push(r);
    else groups.set(to, [r]);
  }

  const digests: Digest[] = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([to, list]) => {
      const results = [...list].sort(compareRows);
      const seen = new Set<string>([to]);
      const cc: string[] = [];
      for (const initiativeId of new Set(results.map((r) => r.initiative_id))) {
        for (const raw of ccByInitiative.get(initiativeId) ?? []) {
          const mail = norm(raw);
          if (mail && !seen.has(mail)) {
            seen.add(mail);
            cc.push(mail);
          }
        }
      }
      cc.sort((a, b) => a.localeCompare(b));
      return {
        to,
        lead_name: results.find((r) => r.lead_name)?.lead_name ?? null,
        cc,
        results,
      };
    });

  return { digests, unreachable: [...unreachable].sort(compareRows) };
}
