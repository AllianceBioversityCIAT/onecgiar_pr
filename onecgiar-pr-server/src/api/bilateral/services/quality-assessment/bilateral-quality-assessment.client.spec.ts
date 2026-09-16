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
 * BIL-QAI-T-5 — AI HTTP client with timeout mapping and body-free logging.
 *
 * Expected outcomes below are taken literally from design.md §5 "AI client" and
 * requirements.md BIL-QAI-R-7 / BIL-QAI-AC-15, never recomputed by calling the
 * client under test. Env is stubbed per test and restored — never read from a real
 * `.env` (memory rule: the environment.ts/env file never travels with the test).
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
    contract_version: '0.1',
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
        fields: { 'Innovation typology': 'Technological' },
      },
    },
  };
}

function readFixture(): unknown {
  return JSON.parse(
    fs.readFileSync(
      path.join(__dirname, './fixtures/ai-response.v0.1.json'),
      'utf8',
    ),
  );
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
      if (result.outcome !== 'ok') {
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
      if (result.outcome !== 'ok') {
        expect(result.http_status).toBe(200);
      }
    });

    it('maps a 200 with one section missing `issues` to malformed', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readFixture() as any;
      delete body.sections.evidence.issues;
      const post = jest.fn(() => of({ data: body, status: 200 }));
      const client = makeClient(post);

      const result = await client.assess(buildPayload(), { resultId: 1 });

      expect(result.outcome).toBe('malformed');
    });
  });

  describe('ok', () => {
    it('parses the v0.1 contract fixture to the internal shape', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const fixture = readFixture();
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
      }
      expect(post).toHaveBeenCalledTimes(1);
    });

    it('keeps a valid overall score (68) untouched', async () => {
      configureEnv({ url: 'https://ai.example.test', key: 'a-key' });
      const body = readFixture() as any;
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
      const body = readFixture() as any;
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
      const body = readFixture() as any;
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

  describe('log privacy (BIL-QAI-AC-15)', () => {
    const LEAK_TITLE = 'LEAK-MARKER-9f3';
    const LEAK_KEY = 'KEY-MARKER-a1';
    const LEAK_HOST = 'leak-host-marker.example.test';

    it('never logs the payload title, the API key, or the host, on any outcome', async () => {
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
      const fixture = readFixture();

      // ok
      configureEnv({ url: `https://${LEAK_HOST}`, key: LEAK_KEY });
      await makeClient(
        jest.fn(() => of({ data: fixture, status: 200 })),
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

      expect(emitted.length).toBeGreaterThan(0);
      for (const line of emitted) {
        expect(line).toMatch(/^event=bilateral_quality_assessment/);
        expect(line).not.toContain(LEAK_TITLE);
        expect(line).not.toContain(LEAK_KEY);
        expect(line).not.toContain(LEAK_HOST);
        expect(line).not.toContain('leak-host-marker');
      }
    });
  });
});
