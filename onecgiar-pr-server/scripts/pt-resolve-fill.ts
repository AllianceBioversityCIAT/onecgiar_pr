import 'dotenv/config';

/**
 * Fills the Progress Tracker indicator map one resumable batch at a time, through a
 * running PRMS API (`POST /api/progress-tracker/indicator-map/resolve`).
 *
 * A whole program does not fit in the 29 s API Gateway window, so each request makes
 * at most `--limit` upstream `/resolve` calls and answers `next_cursor`. On a gateway
 * timeout (502/503/504, or a dropped connection) the **same cursor** is retried: rows
 * the timed-out attempt already wrote are passed over server-side, so a retry never
 * duplicates work or rows.
 *
 * Usage:
 *   PRMS_API_URL=https://<host> PRMS_AUTH_TOKEN=<jwt> \
 *     npx ts-node scripts/pt-resolve-fill.ts [--programs SP01,SP02] [--limit 15]
 *       [--version-id 34] [--force] [--max-retries 5]
 *
 * `--programs` takes PRMS official codes or names (the server matches either); the
 * default is the 13 science programs. `PRMS_AUTH_TOKEN` goes in the `auth` header and
 * is never printed.
 */

const DEFAULT_PROGRAMS = Array.from(
  { length: 13 },
  (_, i) => `SP${String(i + 1).padStart(2, '0')}`,
);
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
/** Client-side ceiling per request — a bit above the 29 s gateway ceiling. */
const REQUEST_TIMEOUT_MS = 35_000;

interface Options {
  baseUrl: string;
  token: string;
  programs: string[];
  limit: number;
  versionId?: number;
  force: boolean;
  maxRetries: number;
}

interface BatchBody {
  status: 'ok' | 'not_found' | 'unavailable';
  processed: number;
  exact: number;
  fuzzy: number;
  unmapped: number;
  skipped: number;
  already_resolved: number;
  total: number;
  cursor: number;
  next_cursor: number | null;
}

type Totals = Omit<BatchBody, 'status' | 'total' | 'cursor' | 'next_cursor'>;

function parseArgs(argv: string[]): Options {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const baseUrl = (process.env.PRMS_API_URL ?? '').replace(/\/+$/, '');
  const token = process.env.PRMS_AUTH_TOKEN ?? '';
  if (!baseUrl || !token) {
    console.error('❌ PRMS_API_URL and PRMS_AUTH_TOKEN must be set.');
    process.exit(1);
  }

  const programs = value('--programs')
    ?.split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const versionId = value('--version-id');

  return {
    baseUrl,
    token,
    programs: programs?.length ? programs : DEFAULT_PROGRAMS,
    limit: Number(value('--limit') ?? 15),
    versionId: versionId ? Number(versionId) : undefined,
    force: argv.includes('--force'),
    maxRetries: Number(value('--max-retries') ?? 5),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One batch request. Returns `null` for a retryable failure (gateway timeout, dropped connection). */
async function postBatch(
  opts: Options,
  programId: string,
  cursor: number,
): Promise<BatchBody | null> {
  let res: Response;
  try {
    res = await fetch(
      `${opts.baseUrl}/api/progress-tracker/indicator-map/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', auth: opts.token },
        body: JSON.stringify({
          programId,
          cursor,
          limit: opts.limit,
          ...(opts.versionId ? { versionId: opts.versionId } : {}),
          ...(opts.force ? { force: true } : {}),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch {
    return null;
  }

  if (RETRYABLE_STATUSES.has(res.status)) return null;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${programId} at cursor ${cursor}`);
  }
  const json: any = await res.json();
  return (json?.response ?? json) as BatchBody;
}

async function fillProgram(opts: Options, programId: string): Promise<Totals> {
  const totals: Totals = {
    processed: 0,
    exact: 0,
    fuzzy: 0,
    unmapped: 0,
    skipped: 0,
    already_resolved: 0,
  };
  let cursor = 0;
  let attempt = 0;

  for (;;) {
    const body = await postBatch(opts, programId, cursor);

    if (!body) {
      attempt += 1;
      if (attempt > opts.maxRetries) {
        throw new Error(
          `${programId}: gave up at cursor ${cursor} after ${opts.maxRetries} retries`,
        );
      }
      const wait = Math.min(2_000 * 2 ** (attempt - 1), 30_000);
      console.log(
        `  ⏳ ${programId} cursor ${cursor}: gateway timeout, retry ${attempt}/${opts.maxRetries} in ${wait / 1000}s`,
      );
      await sleep(wait);
      continue;
    }
    attempt = 0;

    if (body.status !== 'ok') {
      console.log(`  ⚠️  ${programId}: ${body.status}`);
      return totals;
    }

    for (const key of Object.keys(totals) as (keyof Totals)[]) {
      totals[key] += body[key] ?? 0;
    }
    console.log(
      `  ${programId} ${body.cursor}→${body.next_cursor ?? 'end'}/${body.total}: ` +
        `exact ${body.exact} · fuzzy ${body.fuzzy} · none ${body.unmapped} · ` +
        `skipped ${body.skipped} · already ${body.already_resolved}`,
    );

    if (body.next_cursor === null) return totals;
    cursor = body.next_cursor;
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log(
    `🔁 Filling the PT indicator map for ${opts.programs.length} program(s), ${opts.limit} calls per batch${opts.force ? ' (force)' : ''}\n`,
  );

  let failed = 0;
  for (const programId of opts.programs) {
    try {
      const t = await fillProgram(opts, programId);
      console.log(
        `✅ ${programId}: ${t.processed} resolved (exact ${t.exact}, fuzzy ${t.fuzzy}, none ${t.unmapped}), ` +
          `${t.skipped} skipped, ${t.already_resolved} already mapped\n`,
      );
    } catch (err: any) {
      failed += 1;
      console.error(`❌ ${err?.message ?? err}\n`);
    }
  }

  process.exit(failed ? 1 : 0);
}

main();
