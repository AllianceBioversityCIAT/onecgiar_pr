// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-results-browse (PTB-T-7)
//
// Static leak sweep — the static half of `PTB-AC-16` (`PTB-R-6a`, `PTB-R-6b`, `PTB-R-7`).
//
// WHAT THIS GUARD SCANS
// ----------------------
// Every `.ts` / `.html` / `.scss` file under `onecgiar-pr-client/src` (the source that is
// actually compiled/bundled into the shipped client), EXCLUDING:
//   - `*.spec.ts` and `*.cy.ts`           — test-only code, never shipped.
//   - This file itself                    — it necessarily quotes the forbidden patterns.
//   - `src/environments/environment*.ts`  — see "Environment files" below.
//   - `src/app/pages/developers/developers.component.ts` — PRMS public developer documentation
//     portal displaying PRMS's own public API Gateway endpoints (ingest & Swagger docs).
//   - non-source assets (`.png`, `.svg`, `.md`, `.json`, `.snap`, fonts, media, …) — nothing
//     under these extensions is compiled into the Angular bundle, so they sit outside the leak
//     surface `PTB-R-6a`/`PTB-R-7` describe.
//
// PATTERNS (case-insensitive)
// ----------------------------
//   1. `synapsis-analytics` — the upstream vendor host.
//   2. `execute-api`        — the AWS API Gateway domain shape the upstream is fronted by.
//   3. `PT_INTEROP`         — the server-side env-var family (`PT_INTEROP_BASE_URL`,
//      `PT_INTEROP_API_KEY`, `PT_INTEROP_TIMEOUT_MS`; see `onecgiar-pr-server/serverless.yaml`
//      and `progress-tracker-resolve.service.ts`) that must never leak into client code.
//
// ENVIRONMENT FILES — explicit decision (task DoD requires this call to be stated, not silent)
// ------------------------------------------------------------------------------------------
// `src/environments/environment.ts` / `environment.prod.ts` are git-ignored, locally-copied
// files (`.gitignore:45`) — not part of the git-tracked client source, but they DO get inlined
// into the production bundle by the Angular build, so in principle they belong in this guard's
// scope too. They are deliberately EXCLUDED here, and the exclusion is a file-path exclusion,
// not a weakened pattern, because today's local copies already contain two hits that are
// PRMS-owned and unrelated to the Progress Tracker upstream this guard targets:
//   - `environment.prod.ts` `reviewApiUrl` — a PRMS "review API" endpoint that happens to be
//     fronted by AWS API Gateway, i.e. an `execute-api.<region>.amazonaws.com` host. This is a
//     legitimate PRMS-owned execute-api URL, exactly the false-positive shape the task brief
//     calls out ("an unrelated execute-api URL for PRMS itself").
//   - `environment.ts` `bulkUploaderUrl` AND `environment.prod.ts` `bulkUploaderUrl` — both
//     resolve to a `synapsis-analytics.com`-hosted host for PRMS's unrelated "bulk results
//     uploader" feature. This is NOT a Progress Tracker leak (no PT indicator/result data
//     flows through it from this spec's code), but it is worth flagging on its own: the same
//     vendor (Synapsis Analytics) that operates the Progress Tracker upstream also operates a
//     tool PRMS links to directly from the client for a different feature. That is a pre-
//     existing, out-of-scope fact about `bulkUploaderUrl`, not a defect introduced by this
//     spec — reported here per instruction rather than silently accommodated by loosening the
//     regex (which would also blind the guard to a real `synapsis-analytics` leak elsewhere).
// Per the task instruction, the pattern is NOT weakened to avoid these hits; instead the
// (non-git-tracked, machine-local) file path is excluded, and the finding above is the report.
//
// WHAT THIS GUARD CANNOT PROVE (`D-10`, `requirements.md` §9)
// -------------------------------------------------------------
// This is a source-text sweep only. It cannot see:
//   - What the browser actually issues over the network (redirects, a stray absolute URL built
//     dynamically from concatenated strings that never appear as one literal, a proxy rewrite).
//   - Anything injected at runtime (e.g. via a remote-config fetch).
//   - A PT id that has already been RECEIVED into `result_key` (a two-part opaque token, e.g.
//     `8006329bfd49:1` — `pt-results-browse.component.spec.ts`) or `source.pt_url`, then parsed
//     back out and sent onward under some other name. `PTB-R-6c` permits the id to arrive in
//     those fields, so this guard cannot treat their mere presence as a leak — and once it is in
//     a runtime variable, no static pattern here can tell "read and re-displayed" apart from
//     "read and re-sent." That case is invisible to source-text scanning by construction.
//   - **`environment.ts` / `environment.prod.ts` are excluded from this scan (see above), so a
//     new `PT_INTEROP`/`synapsis-analytics`/`execute-api` key added to either file — arguably the
//     most likely real leak vector, since it is exactly how the *server*-side secret is
//     configured — would go completely undetected by this guard.** No pattern-scan substitute is
//     applied here (weakening the exclusion was rejected above precisely because today's files
//     already contain unrelated hits); the closest static substitute would be grepping the
//     **built** production bundle (`dist/`) post-inlining, which this guard does not do. Today
//     that gap is closed only by the dynamic walkthrough and by not hand-adding PT secrets to a
//     client env file in the first place (they belong in `PT_INTEROP_*` on the server only).
// The dynamic half — inspecting the browser's network log during a full browse-to-create
// session — is the family-level TEST walkthrough (`PTB-AC-16` dynamic half, `SC-3`, `D-10`).
// A green run of this guard is evidence for the static half only; it is not proof that "no such
// request is ever issued."
//
// BEHAVIOURAL PROOF OF `PTB-R-6b` (the client sends PRMS ids, never a PT id) LIVES ELSEWHERE
// -----------------------------------------------------------------------------------------
// This file's `indicator_id` check (below) is a narrow lexical guard, not the behavioural proof —
// see that test's own comment for why. The actual behavioural evidence that the client issues
// requests keyed on the PRMS id only:
//   - `pt-results-browse.component.spec.ts` ("fetches when tocIndicatorId becomes set, sending no
//     query keys beyond the allow-list") — asserts the exact call `GET_progressTrackerResults(123, {})`.
//   - `results-api.service.spec.ts` (`GET_progressTrackerResults` describe block) — asserts the
//     full built request URL contains the PRMS id in the path and nothing else.

import * as fs from 'fs';
import * as path from 'path';

const CLIENT_SRC_ROOT = path.resolve(__dirname, '../../../../../../../../../..', 'src');
const THIS_FILE = path.resolve(__filename);
const PT_RESULTS_BROWSE_DIR = path.resolve(__dirname);

const SCAN_EXTENSIONS = new Set(['.ts', '.html', '.scss']);
const EXCLUDED_SUFFIXES = ['.spec.ts', '.cy.ts'];
// File-level exclusion, matching the header's "environment*.ts" wording exactly (NOT a whole-
// directory exclusion) — if a non-`environment*` file is ever added under `src/environments/`,
// it stays in scope by default rather than silently riding along with this carve-out.
const ENVIRONMENTS_DIR_NAME = 'environments';
const ENVIRONMENT_FILE_REGEX = /^environment.*\.ts$/;

function isExcludedEnvironmentFile(full: string, name: string): boolean {
  return path.basename(path.dirname(full)) === ENVIRONMENTS_DIR_NAME && ENVIRONMENT_FILE_REGEX.test(name);
}

// PRMS-owned public developer documentation endpoints (ingest & Swagger docs on AWS API Gateway).
// These are PRMS-owned developer documentation endpoints, not Progress Tracker upstream leaks
// (PTB-AC-16: "PRMS's own pre-existing execute-api / synapsis-analytics.com calls are out of scope").
function isExcludedDevelopersFile(full: string): boolean {
  const rel = path.relative(CLIENT_SRC_ROOT, full).replace(/\\/g, '/');
  return rel === 'app/pages/developers/developers.component.ts';
}

/** Walk `dir` and return absolute paths of every scannable source file, honoring the exclusions above. */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (full === THIS_FILE) continue;
    if (!SCAN_EXTENSIONS.has(path.extname(entry.name))) continue;
    if (EXCLUDED_SUFFIXES.some(suffix => entry.name.endsWith(suffix))) continue;
    if (isExcludedEnvironmentFile(full, entry.name)) continue;
    if (isExcludedDevelopersFile(full)) continue;
    out.push(full);
  }
  return out;
}

/** Redact a matched line so a key-like value is never printed in a Jest failure message (`.cursorrules`). */
function redact(line: string): string {
  return line
    .replace(/https?:\/\/[^\s'"`]+/gi, '<redacted-url>')
    // Scheme-less hosts: `xxxxx.execute-api.<region>.amazonaws.com` (an AWS API Gateway id is
    // itself sensitive-shaped) and any `*.synapsis-analytics.com` host, written without `http(s)://`.
    .replace(/[\w-]+\.execute-api\.[\w.-]+/gi, '<redacted-host>')
    .replace(/[\w.-]*synapsis-analytics\.com/gi, '<redacted-host>')
    .replace(/[A-Za-z0-9_+/=-]{16,}/g, '<redacted>');
}

interface Hit {
  file: string;
  line: number;
  pattern: string;
  redacted: string;
}

function scanForPatterns(files: string[], patterns: RegExp[]): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          hits.push({
            file: path.relative(CLIENT_SRC_ROOT, file),
            line: idx + 1,
            pattern: pattern.source,
            redacted: redact(line.trim())
          });
        }
      }
    });
  }
  return hits;
}

function formatHits(hits: Hit[]): string {
  return hits.map(h => `${h.file}:${h.line} [${h.pattern}] -> ${h.redacted}`).join('\n');
}

/** Pull the `${...}` interpolation sitting between two literal path segments of a template-literal URL. */
function extractPathParam(urlTemplate: string, before: string, after: string): string {
  const escapedBefore = before.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const escapedAfter = after.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const match = urlTemplate.match(new RegExp(`${escapedBefore}(\\$\\{[^}]*\\})${escapedAfter}`));
  return match ? match[1] : '';
}

describe('PT client leak guard (PTB-T-7, static half of PTB-AC-16)', () => {
  const sourceFiles = collectSourceFiles(CLIENT_SRC_ROOT);

  it('sanity: the scan actually walked a non-trivial number of files', () => {
    // Guards against a path-resolution mistake silently turning every assertion below into a
    // vacuous pass over zero files.
    expect(sourceFiles.length).toBeGreaterThan(500);
  });

  it('contains no occurrence of the upstream host/key patterns (synapsis-analytics, execute-api, PT_INTEROP)', () => {
    const patterns = [/synapsis-analytics/i, /execute-api/i, /pt_interop/i];
    const hits = scanForPatterns(sourceFiles, patterns);
    expect(formatHits(hits)).toBe('');
  });

  it('every Progress Tracker call in results-api.service.ts targets the PRMS origin (no absolute http(s) URL)', () => {
    const serviceFile = path.resolve(CLIENT_SRC_ROOT, 'app/shared/services/api/results-api.service.ts');
    const text = fs.readFileSync(serviceFile, 'utf8');

    // Every call into the `progress-tracker/...` path must be built off `this.baseApiBaseUrl`
    // (or `this.baseApiBaseUrlV2`, same PRMS-origin family) — never an absolute http(s) literal.
    const callLineRegex = /^\s*return\s+this\.http\.\w+<[^>]*>\(\s*`([^`]*progress-tracker\/[^`]*)`/gm;
    const calls: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = callLineRegex.exec(text)) !== null) {
      calls.push(match[1]);
    }

    // Sanity: both PT methods from PTB-T-1 must actually be present and scanned, or this
    // assertion would vacuously pass over zero calls.
    expect(calls.length).toBeGreaterThanOrEqual(2);

    for (const url of calls) {
      expect(url.startsWith('${this.baseApiBaseUrl}') || url.startsWith('${this.baseApiBaseUrlV2}')).toBe(true);
      expect(/^https?:\/\//i.test(url)).toBe(false);
    }

    // Belt-and-braces: no absolute http(s) literal anywhere near a progress-tracker reference
    // in this file (covers a differently-shaped leak the regex above would miss, e.g. a URL
    // built via string concatenation rather than the same-line template literal).
    const progressTrackerLines = text
      .split('\n')
      .map((line, idx) => ({ line, idx }))
      .filter(({ line }) => /progress-tracker/i.test(line));
    const absoluteUrlHits = progressTrackerLines.filter(({ line }) => /https?:\/\//i.test(line));
    expect(formatHits(absoluteUrlHits.map(({ line, idx }) => ({ file: 'results-api.service.ts', line: idx + 1, pattern: 'http(s)://', redacted: redact(line.trim()) })))).toBe('');

    // Optional/cheap (Reviewer suggestion): the path parameter itself must be exactly the PRMS
    // id — `${tocIndicatorId}` / `${programId}` — never anything else interpolated in its place.
    const resultsUrl = calls.find(u => u.includes('indicators/'));
    const readyCountsUrl = calls.find(u => u.includes('programs/'));
    expect(resultsUrl).toBeDefined();
    expect(readyCountsUrl).toBeDefined();
    expect(extractPathParam(resultsUrl!, 'indicators/', '/results')).toBe('${tocIndicatorId}');
    expect(extractPathParam(readyCountsUrl!, 'programs/', '/ready-counts')).toBe('${programId}');

    // Proof this assertion is not vacuous: mutate a COPY of the template string (never the
    // service file itself) and confirm the extractor stops agreeing with the expected id.
    const mutatedResultsUrl = resultsUrl!.replace('${tocIndicatorId}', '${indicator_id}');
    expect(extractPathParam(mutatedResultsUrl, 'indicators/', '/results')).not.toBe('${tocIndicatorId}');
  });

  it('no snake_case `indicator_id` token appears in pt-results-browse source (lexical guard, not behavioural proof — see header)', () => {
    // What this test actually checks: the literal token `indicator_id` (or `pt_indicator_id`) is
    // absent from this folder's non-test source. It does NOT prove `PTB-R-6b` on its own —
    // outgoing requests are built in `results-api.service.ts` (scanned separately above) and in
    // the PTB-T-5 create-payload builder (outside this folder, outside this task's scope); and a
    // leak that read the PT id out of `result_key` (e.g. by splitting `'8006329bfd49:1'`) and
    // sent it under some other field name would not contain this token at all, so it would pass
    // here undetected — see "WHAT THIS GUARD CANNOT PROVE" above. The behavioural proof that this
    // component's own outgoing call carries only the PRMS id lives in
    // `pt-results-browse.component.spec.ts` and `results-api.service.spec.ts` (see header).
    //
    // What this test IS worth: `indicator_id` is also the PRMS indicator field name used
    // elsewhere in the app (e.g. `lab-report-form.component.spec.ts`), so this check is
    // deliberately scoped to `pt-results-browse/` only — widening it to the real request sites
    // would flag that legitimate, unrelated usage.
    const filesInFolder = collectSourceFiles(PT_RESULTS_BROWSE_DIR);
    expect(filesInFolder.length).toBeGreaterThan(0);

    // Snake_case only: `tocIndicatorId` (the PRMS id, camelCase, no underscore) must not be
    // caught by this — and isn't, since the regex requires the literal underscore.
    const hits = scanForPatterns(filesInFolder, [/indicator_id/i, /pt_indicator_id/i]);
    expect(formatHits(hits)).toBe('');
  });
});
