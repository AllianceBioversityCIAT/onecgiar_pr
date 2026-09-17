import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Observable, of, throwError } from 'rxjs';
import {
  AiClientOutcome,
  BilateralQualityAssessmentClient,
} from './bilateral-quality-assessment.client';
import { QualityPayload } from './bilateral-quality-rules';

/**
 * BIL-QAI-T-5 / BIL-QAI-T-5b — AI HTTP client with timeout mapping, body-free logging, and
 * (v0.2) the widened schema check for `status` / `degraded_reason` / a grey **section**.
 *
 * Expected outcomes below are taken literally from design.md §5 "AI client" / "AI client —
 * v0.2 schema check", requirements.md BIL-QAI-R-4 / BIL-QAI-R-7 / BIL-QAI-AC-15 / AC-17, never
 * recomputed by calling the client under test. Env is stubbed per test and restored — never
 * read from a real `.env` (memory rule: the environment.ts/env file never travels with the
 * test).
 */

const ENV_KEYS = [
  'BILATERAL_AI_QUALITY_URL',
  'BILATERAL_AI_QUALITY_TIMEOUT_MS',
  'MICROSERVICE_API_KEY',
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function buildPayload(overrides: { title?: string } = {}): QualityPayload {
  return {
    contract_version: '0.2',
    result: {
      type: 'Innovation development',
      reporting_phase: 'Reporting 2026',
      reporting_center: 'AfricaRice',
      primary_science_program: 'Sustainable Farming',
    },
    sections: {
      general_information: {
        title: overrides.title ?? 'A sample bilateral result',
        description: 'Description text',
        result_level: 'Output',
      },
      contributors_and_partners: {
        lead_center: 'AfricaRice',
        contributing_centers: [],
      },
      geographic_location: {
        scope: 'National',
        countries: ["Côte d'Ivoire"],
      },
      evidence: [
        {
          description: 'A public link',
          link: 'https://example.org/doc',
          source: 'url',
          visibility: 'public',
          tags: ['Gender'],
        },
        {
          description: 'A private file',
          link: null,
          source: 'prms_repository',
          visibility: 'private',
          tags: [],
        },
      ],
      type_specific: {
        type: 'innovation_development',
        fields: { 'Innovation typology': 'Technological innovation' },
      },
    },
  };
}

function readFixture(name: string): unknown {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, `./fixtures/${name}`), 'utf8'),
  );
}

function readV02Fixture(): any {
  return readFixture('ai-response.v0.2.json');
}

function makeClient(post: jest.Mock): BilateralQualityAssessmentClient {
  const httpService = { post } as unknown as HttpService;
  return new BilateralQualityAssessmentClient(httpService);
}

function configureEnv(
  overrides: {
    url?: string;
    key?: string;
    timeoutMs?: string;
  } = {},
): void {
  if (overrides.url !== undefined) {
    process.env.BILATERAL_AI_QUALITY_URL = overrides.url;
  }
  if (overrides.key !== undefined) {
    process.env.MICROSERVICE_API_KEY = overrides.key;
  }
  if (overrides.timeoutMs !== undefined) {
    process.env.BILATERAL_AI_QUALITY_TIMEOUT_MS = overrides.timeoutMs;
  }
}

describe('BilateralQualityAssessmentClient', () => {
  describe('not_configured', () => {
    it('short-circuits to not_configured before any HTTP call when env is unset', async () => {
      const post = jest.fn();
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 7 });

      expect(result.outcome).toBe('not_configured');
      expect(post).not.toHaveBeenCalled();
    });

    it('reports isConfigured() = false when only the key is set', () => {
      configureEnv({ key: 'a-key' });
      const client = makeClient(jest.fn());
      expect(client.isConfigured()).toBe(false);
    });

    it('reports isConfigured() = false when only the URL is set', () => {
      configureEnv({ url: 'https://ai.example.test' });
      const client = makeClient(jest.fn());
      expect(client.isConfigured()).toBe(false);
    });
  });

  describe('timeout', () => {
    it('resolves to timeout at exactly the configured window (never-resolving post + fake timers)', async () => {
      configureEnv({
        url: 'https://ai.example.test',
        key: 'a-key',
        timeoutMs: '5000',
      });
      const post = jest.fn(() => new Observable<never>(() => undefined));
      const client = makeClient(post);

      jest.useFakeTimers();

      let settled: AiClientOutcome | undefined;
      const promise = client
        .assess(buildPayload(), { resultId: 42 })
        .then((r) => {
          settled = r;
          return r;
        });

      await jest.advanceTimersByTimeAsync(4999);
      expect(settled).toBeUndefined();

      await jest.advanceTimersByTimeAsync(1);
      const result = await promise;

      expect(result.outcome).toBe('timeout');
      expect(result.elapsed_ms).toBe(5000);
      expect(post).toHaveBeenCalledTimes(1);
    });

    it('falls back to the 60000ms default when the env value is not a positive integer', () => {
      configureEnv({
        url: 'https://ai.example.test',
        key: 'a-key',
        timeoutMs: '-5',
      });
      const client = makeClient(jest.fn());
      expect(client.timeoutMs()).toBe(60_000);
      expect(client.timeoutSeconds()).toBe(60);
    });

    it('falls back to the 60000ms default when the env value is entirely unset', () => {
      // beforeEach already deletes BILATERAL_AI_QUALITY_TIMEOUT_MS; this asserts the
      // "unset" branch specifically, distinct from the "invalid value" case above
      // (previously untested — Reviewer open item).
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const client = makeClient(jest.fn());
      expect(client.timeoutMs()).toBe(60_000);
      expect(client.timeoutSeconds()).toBe(60);
    });
  });

  describe('http_error', () => {
    it('maps a 503 response to http_error with the status', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const post = jest.fn(() =>
        throwError(() => ({
          isAxiosError: true,
          message: 'Request failed with status code 503',
          response: { status: 503 },
        })),
      );
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('http_error');
      if (result.outcome !== 'ok' && result.outcome !== 'ai_unavailable') {
        expect(result.http_status).toBe(503);
      }
    });
  });

  describe('malformed', () => {
    it('maps a 200 with an empty body to malformed', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const post = jest.fn(() => of({ data: {}, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
      if (result.outcome !== 'ok' && result.outcome !== 'ai_unavailable') {
        expect(result.http_status).toBe(200);
      }
    });

    it('maps a 200 with one section missing `issues` to malformed', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readV02Fixture();
      delete body.sections.evidence.issues;
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });

    it('maps a 2xx text/html body to malformed', async () => {
      // Reviewer open item: previously untested. A string body fails `isRecord` immediately.
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const post = jest.fn(() =>
        of({ data: '<html><body>Not JSON</body></html>', status: 200 }),
      );
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });

    it('maps a valid v0.1-shaped body missing `status` to malformed (v0.2)', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readV02Fixture();
      delete body.status;
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });

    it('maps a body missing `degraded_reason` to malformed (v0.2)', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readV02Fixture();
      delete body.degraded_reason;
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });

    it('maps a body whose `status` is not in the enum to malformed (v0.2)', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readV02Fixture();
      body.status = 'in_progress';
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });

    it('maps a body whose `overall.verdict` is `grey` to malformed — overall stays 3-colour (v0.2)', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readV02Fixture();
      body.overall.verdict = 'grey';
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });
  });

  describe('ok', () => {
    it('parses the v0.2 contract fixture to the internal shape', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const fixture = readV02Fixture();
      const post = jest.fn(() => of({ data: fixture, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.response.overall.verdict).toBe('amber');
        expect(result.response.sections.general_information.verdict).toBe(
          'green',
        );
        expect(result.response.sections.evidence.issues).toEqual([
          'No evidence item links the claim to a verifiable source',
        ]);
        expect(result.response.evidence).toHaveLength(2);
        expect(result.response.evidence[1].verdict).toBe('grey');
        expect(result.ai_status).toBe('completed');
        expect(result.degraded_reason).toBeNull();
      }
      expect(post).toHaveBeenCalledTimes(1);
    });

    it('a grey **section** verdict is accepted and survives into the parsed shape (BIL-QAI-R-4)', async () => {
      const fixture = readV02Fixture();
      // Sanity: the fixture itself carries the grey section this test targets.
      expect(fixture.sections.type_specific.verdict).toBe('grey');
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const post = jest.fn(() => of({ data: fixture, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.response.sections.type_specific.verdict).toBe('grey');
        expect(result.response.sections.type_specific.comments).toBe(
          'no type-specific details were reported',
        );
      }
    });

    it('keeps a valid overall score (68) untouched', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readV02Fixture();
      body.overall.score = 68;
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.response.overall.score).toBe(68);
      }
    });

    it('sanitizes a non-numeric overall score ("68") to null, outcome stays ok', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readV02Fixture();
      body.overall.score = '68';
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.response.overall.score).toBeNull();
      }
    });

    it('sanitizes an out-of-range section score (900) to null, outcome stays ok', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readV02Fixture();
      body.sections.general_information.score = 900;
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.response.sections.general_information.score).toBeNull();
      }
    });
  });

  describe('v0.2 — status / degraded_reason mapping (BIL-QAI-R-7)', () => {
    it('`status: "partial"` ⇒ outcome carries ai_status "partial" and the reason', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const fixture = readFixture('ai-response.partial.json');
      const post = jest.fn(() => of({ data: fixture, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.ai_status).toBe('partial');
        expect(result.degraded_reason).toBe(
          'One evidence link could not be opened, so the evidence section was assessed on descriptions only.',
        );
      }
    });

    it('`status: "unavailable"` ⇒ outcome is distinguishable from every transport failure', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const fixture = readFixture('ai-response.unavailable.json');
      const post = jest.fn(() => of({ data: fixture, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ai_unavailable');
      expect(result.outcome).not.toBe('ok');
      expect([
        'not_configured',
        'timeout',
        'http_error',
        'malformed',
      ]).not.toContain(result.outcome);
      if (result.outcome === 'ai_unavailable') {
        expect(result.degraded_reason).toBe(
          'The assessment model could not produce a verdict for this submission.',
        );
      }
    });

    it('truncates a 400-character degraded_reason to 255', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readFixture('ai-response.partial.json') as any;
      body.degraded_reason = 'x'.repeat(400);
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.degraded_reason).toHaveLength(255);
      }
    });

    it('strips a URL out of degraded_reason before it leaves the client (falsifying input, AC-9)', async () => {
      const LEAK_MARKER = 'LEAK-MARKER-9f3';
      const LEAK_URL = 'https://ai-internal.example';
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readFixture('ai-response.partial.json') as any;
      body.degraded_reason = `${LEAK_MARKER} at ${LEAK_URL}`;
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.degraded_reason).not.toContain(LEAK_URL);
        expect(result.degraded_reason).not.toContain('ai-internal.example');
      }
    });
  });

  describe('type_specific is optional', () => {
    // 🛑 Result 11883 (Other output, 17-sep-2026): the AI answered `completed` with four good
    // sections and no `type_specific`, because that result type HAS no type-specific section. The
    // validator demanded all five, so a usable verdict became `malformed` and the user was told
    // "Quality check unavailable". A section the editor does not render must not be required.
    it('accepts a four-section response for a type with no type-specific section', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'k' });
      const body = readV02Fixture();
      delete body.sections.type_specific;
      const client = makeClient(jest.fn(() => of({ data: body, status: 200 })));

      const result = await client.assess(buildPayload(), { resultId: 11883 });

      expect(result.outcome).toBe('ok');
      if (result.outcome === 'ok') {
        expect(result.response.sections.type_specific).toBeUndefined();
        expect(Object.keys(result.response.sections)).toHaveLength(4);
      }
    });

    it('still rejects a response missing one of the four every result has', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'k' });
      const body = readV02Fixture();
      delete body.sections.geographic_location;
      const client = makeClient(jest.fn(() => of({ data: body, status: 200 })));

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });

    // Absent is fine; present-but-broken is still a contract breach.
    it('rejects a type_specific that is present and malformed', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'k' });
      const body = readV02Fixture();
      body.sections.type_specific = { verdict: 'purple' };
      const client = makeClient(jest.fn(() => of({ data: body, status: 200 })));

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });
  });

  describe('outbound request config', () => {
    it('posts to the configured URL + path with X-API-Key, Content-Type and the guard timeout', async () => {
      // Reviewer open item: previously nothing asserted the outbound config.
      configureEnv({
        url: 'https://ai.example.test',
        key: 'a-key-value',
        timeoutMs: '12345',
      });
      const fixture = readV02Fixture();
      const post = jest.fn(() => of({ data: fixture, status: 200 }));
      const client = makeClient(post);
      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);

      const userEmail = 'centre.reviewer@cgiar.org';
      await client.assess(buildPayload(), { resultId: 1, userEmail });

      expect(post).toHaveBeenCalledTimes(1);
      const [url, body, config] = post.mock.calls[0] as unknown as [
        string,
        QualityPayload & { user_id: string },
        Record<string, any>,
      ];
      expect(url).toBe('https://ai.example.test/prms/quality-assessment');
      expect(body.user_id).toBe(userEmail);
      expect(config.headers['X-API-Key']).toBe('a-key-value');
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.timeout).toBe(12345);
      // design.md §8: JSON columns sized for ≤ 32 KB per row — the client bounds the
      // response it will accept with headroom over that budget.
      expect(config.maxContentLength).toBe(65_536);
      expect(config.maxBodyLength).toBe(65_536);
      expect(logSpy).toHaveBeenCalled();
      for (const call of logSpy.mock.calls) {
        expect(call.map(String).join(' ')).not.toContain(userEmail);
      }
    });

    it('trims trailing slashes from BILATERAL_AI_QUALITY_URL before building the request URL', async () => {
      // Reviewer open item: previously untested.
      configureEnv({ url: 'https://ai.example.test///', key: 'a-key' });
      const fixture = readV02Fixture();
      const post = jest.fn(() => of({ data: fixture, status: 200 }));
      const client = makeClient(post);

      await client.assess(buildPayload(), { resultId: 1 });

      const [url] = post.mock.calls[0] as unknown as [string, unknown, unknown];
      expect(url).toBe('https://ai.example.test/prms/quality-assessment');
    });
  });

  describe('log privacy (BIL-QAI-AC-15)', () => {
    const LEAK_TITLE = 'LEAK-MARKER-9f3';
    const LEAK_KEY = 'KEY-MARKER-a1';
    const LEAK_HOST = 'leak-host-marker.example.test';

    it('never logs the payload title, the API key, the host, or any part of degraded_reason, on any outcome', async () => {
      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      const payload = buildPayload({ title: LEAK_TITLE });
      const okFixture = readV02Fixture();
      const LEAK_REASON = 'LEAK-REASON-7c2';
      const unavailableFixture = readFixture(
        'ai-response.unavailable.json',
      ) as any;
      unavailableFixture.degraded_reason = LEAK_REASON;

      // ok
      configureEnv({ url: `https://${LEAK_HOST}`, key: LEAK_KEY });
      await makeClient(
        jest.fn(() => of({ data: okFixture, status: 200 })),
      ).assess(payload, { resultId: 1 });

      // ai_unavailable (v0.2) — degraded_reason must never reach a log line
      await makeClient(
        jest.fn(() => of({ data: unavailableFixture, status: 200 })),
      ).assess(payload, { resultId: 1 });

      // http_error
      await makeClient(
        jest.fn(() =>
          throwError(() => ({
            isAxiosError: true,
            message: `Request failed against ${LEAK_HOST}`,
            response: { status: 503 },
          })),
        ),
      ).assess(payload, { resultId: 1 });

      // malformed
      await makeClient(jest.fn(() => of({ data: {}, status: 200 }))).assess(
        payload,
        { resultId: 1 },
      );

      // not_configured
      delete process.env.BILATERAL_AI_QUALITY_URL;
      delete process.env.MICROSERVICE_API_KEY;
      await makeClient(jest.fn()).assess(payload, { resultId: 1 });

      // timeout
      configureEnv({
        url: `https://${LEAK_HOST}`,
        key: LEAK_KEY,
        timeoutMs: '10',
      });
      jest.useFakeTimers();
      const timeoutClient = makeClient(
        jest.fn(() => new Observable<never>(() => undefined)),
      );
      const timeoutPromise = timeoutClient.assess(payload, { resultId: 1 });
      await jest.advanceTimersByTimeAsync(10);
      await timeoutPromise;
      jest.useRealTimers();

      const emitted = [
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ].map((call) => String(call[0]));

      // Reviewer open item: exact count, not just "at least one" — six assess() calls above,
      // one terminal log line each.
      expect(emitted).toHaveLength(6);
      for (const line of emitted) {
        expect(line).toMatch(/^event=bilateral_quality_assessment/);
        expect(line).not.toContain(LEAK_TITLE);
        expect(line).not.toContain(LEAK_KEY);
        expect(line).not.toContain(LEAK_HOST);
        expect(line).not.toContain('leak-host-marker');
        expect(line).not.toContain(LEAK_REASON);
      }
    });
  });
});
