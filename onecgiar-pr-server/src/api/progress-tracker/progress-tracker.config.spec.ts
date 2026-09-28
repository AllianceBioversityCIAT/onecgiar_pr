// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  PT_INTEROP_TIMEOUT_MS_DEFAULT,
  PT_INTEROP_API_GATEWAY_CEILING_MS,
  PT_INTEROP_TIMEOUT_MS_MAX,
  getProgressTrackerTimeoutMs,
} from './progress-tracker.config';

/**
 * `PTM-TEST-2` — `PTM-R-8`, `PTM-AC-15`. Reads the COMMITTED `serverless.yaml` from
 * disk, never a fixture copy — a spec that never opens the real file asserts nothing
 * (`tasks.md` `PTM-T-2` falsifier: "the spec reads the YAML that already exists").
 *
 * No YAML-parsing dependency is added to the package for this: `functions:` is the
 * last top-level section of `serverless.yaml`, so everything from that marker to the
 * end of the file belongs to it, and a small regex is enough to pull
 * `functions.main.timeout` out of it.
 */
const SERVERLESS_YAML_PATH = path.resolve(
  __dirname,
  '../../../serverless.yaml',
);

function readServerlessYaml(): string {
  return fs.readFileSync(SERVERLESS_YAML_PATH, 'utf8');
}

function extractFunctionsMainTimeoutSeconds(
  yamlText: string,
): number | undefined {
  const functionsIndex = yamlText.indexOf('\nfunctions:');
  if (functionsIndex === -1) {
    return undefined;
  }
  const functionsBlock = yamlText.slice(functionsIndex);
  const match = functionsBlock.match(/^[ \t]*timeout:[ \t]*(\d+)[ \t]*$/m);
  return match ? Number(match[1]) : undefined;
}

describe('progress-tracker.config — serverless.yaml timeout (PTM-AC-15)', () => {
  const ENV_KEY = 'PT_INTEROP_TIMEOUT_MS';
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalEnv;
    }
  });

  it('declares an explicit functions.main.timeout in the committed serverless.yaml', () => {
    // Falsifier: delete the `timeout:` line from serverless.yaml -> this goes red on
    // the assertion, not on a missing file (the file already exists on disk).
    const timeoutSeconds =
      extractFunctionsMainTimeoutSeconds(readServerlessYaml());
    expect(typeof timeoutSeconds).toBe('number');
  });

  it('defaults the call timeout to 25 000 ms, strictly below the 29 000 ms API Gateway ceiling (P-5)', () => {
    expect(getProgressTrackerTimeoutMs()).toBe(PT_INTEROP_TIMEOUT_MS_DEFAULT);
    expect(getProgressTrackerTimeoutMs()).toBeLessThan(
      PT_INTEROP_API_GATEWAY_CEILING_MS,
    );
  });

  it('PT_INTEROP_TIMEOUT_MS overrides the default (PTM-R-5)', () => {
    process.env[ENV_KEY] = '28000';
    expect(getProgressTrackerTimeoutMs()).toBe(28_000);
  });

  it('treats an empty-string env var as unset (falls back to the default)', () => {
    process.env[ENV_KEY] = '';
    expect(getProgressTrackerTimeoutMs()).toBe(PT_INTEROP_TIMEOUT_MS_DEFAULT);
  });

  it(
    'clamps an over-ceiling override to PT_INTEROP_TIMEOUT_MS_MAX, strictly below the ' +
      '29 000 ms gateway ceiling (PTM-T-3 closes PTM-T-2 review finding: 45000 previously ' +
      'passed through unclamped)',
    () => {
      process.env[ENV_KEY] = '45000';
      expect(getProgressTrackerTimeoutMs()).toBe(PT_INTEROP_TIMEOUT_MS_MAX);
      expect(getProgressTrackerTimeoutMs()).toBeLessThan(
        PT_INTEROP_API_GATEWAY_CEILING_MS,
      );
    },
  );

  it(
    'falls back to the default on a non-numeric override (PTM-T-3 closes PTM-T-2 review ' +
      "finding: 'abc' previously produced NaN, which Axios reads as falsy -> no timeout at all)",
    () => {
      process.env[ENV_KEY] = 'abc';
      expect(getProgressTrackerTimeoutMs()).toBe(PT_INTEROP_TIMEOUT_MS_DEFAULT);
    },
  );

  it(
    'falls back to the default on a whitespace-only override (previously produced 0, ' +
      'also falsy to Axios -> no timeout at all)',
    () => {
      process.env[ENV_KEY] = '   ';
      expect(getProgressTrackerTimeoutMs()).toBe(PT_INTEROP_TIMEOUT_MS_DEFAULT);
    },
  );

  it(
    'the declared Lambda timeout (functions.main.timeout, in ms) is >= the configured ' +
      'call timeout — otherwise Lambda kills the invocation before the HTTP client times out',
    () => {
      // Falsifier: `timeout: 29` must still pass this (29 000 >= 25 000); `timeout: 5`
      // must fail it (5 000 < 25 000).
      const timeoutSeconds =
        extractFunctionsMainTimeoutSeconds(readServerlessYaml());
      const lambdaTimeoutMs = Number(timeoutSeconds) * 1000;
      expect(lambdaTimeoutMs).toBeGreaterThanOrEqual(
        getProgressTrackerTimeoutMs(),
      );
    },
  );

  it('every PT_INTEROP_* value in serverless.yaml is an ${env:...} reference, never a literal (.cursorrules)', () => {
    const yamlText = readServerlessYaml();
    const lines = yamlText.split('\n');
    for (const key of [
      'PT_INTEROP_BASE_URL',
      'PT_INTEROP_API_KEY',
      'PT_INTEROP_TIMEOUT_MS',
    ]) {
      const line = lines.find((candidate) =>
        candidate.trim().startsWith(`${key}:`),
      );
      expect(line).toBeDefined();
      expect(line).toMatch(new RegExp(`\\$\\{env:${key}\\}`));
    }
  });
});
