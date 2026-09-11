import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { defer, of } from 'rxjs';
import { CgspaceDiscoveryService } from './cgspace-discovery.service';
import { CgspaceDiscoveryMapper } from './cgspace-discovery.mapper';
import { CgspaceSearchQueryDto } from './dto/cgspace-search-query.dto';
import { CgspaceFacetQueryDto } from './dto/cgspace-facet-query.dto';
import { KP_REPOSITORIES, KpRepository } from './repositories.config';

/**
 * `KPM-T-4` — parallel fan-out, per-source cache, statuses, telemetry, facet union.
 *
 * Verification cases (a)-(h) of the `KPM-T-4` work order, plus the two forward pointers
 * (facet cache key includes `repository`; the search cache key is per source).
 *
 * Two deliberate choices, both from the task's disqualifier list:
 *  - every upstream failure is a **rejected promise** (`defer(() => Promise.reject(err))`), never a
 *    synchronous `throwError`, so the timeout branch and the `allSettled` isolation are really
 *    exercised;
 *  - upstream params are asserted **per call, per repository** — a bare
 *    `toHaveBeenCalledTimes(3)` would not prove the adapter translation.
 */

const BASE_URLS: Record<KpRepository, string> = {
  cgspace: 'https://cgspace.cgiar.org/server/api',
  melspace: 'https://repo.mel.cgiar.org/server/api',
  worldfish: 'https://digitalarchive.worldfishcenter.org/server/api',
};

/** The upstream hostnames and env var names that must never reach a response body or a log. */
const HOSTNAMES = [
  'cgspace.cgiar.org',
  'repo.mel.cgiar.org',
  'digitalarchive.worldfishcenter.org',
];
const ENV_NAMES = [
  'CGSPACE_DISCOVERY_URL',
  'MELSPACE_DISCOVERY_URL',
  'WORLDFISH_DISCOVERY_URL',
];

const ALL: KpRepository[] = ['cgspace', 'melspace', 'worldfish'];

interface HalItemOptions {
  uuid: string;
  handle: string;
  title: string;
  type?: string;
  year?: string;
  doi?: string;
}

/** Builds one DSpace HAL object node using *that repository's* metadata field names. */
function halNode(repository: KpRepository, options: HalItemOptions) {
  const fields = KP_REPOSITORIES[repository].fields;
  const metadata: Record<string, { value: string }[]> = {
    [fields.title]: [{ value: options.title }],
    [fields.type]: [{ value: options.type ?? 'Journal Article' }],
    [fields.year]: [{ value: options.year ?? '2026' }],
    [fields.authors[0]]: [{ value: 'Jane Doe' }],
    [fields.uri]: [{ value: `https://hdl.handle.net/${options.handle}` }],
  };
  if (options.doi) {
    metadata[fields.doi] = [{ value: options.doi }];
  }
  return {
    _embedded: {
      indexableObject: {
        uuid: options.uuid,
        handle: options.handle,
        metadata,
      },
    },
  };
}

function halPage(
  repository: KpRepository,
  items: HalItemOptions[],
  page: Partial<{
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }> = {},
) {
  return {
    _embedded: {
      searchResult: {
        _embedded: { objects: items.map((item) => halNode(repository, item)) },
        page: {
          number: page.number ?? 0,
          size: page.size ?? 10,
          totalElements: page.totalElements ?? items.length,
          totalPages: page.totalPages ?? (items.length > 0 ? 1 : 0),
        },
      },
    },
  };
}

function facetHal(values: { label: string; count: number }[]) {
  return { _embedded: { values } };
}

type SourceBehavior = { data: any } | { error: any };

describe('CgspaceDiscoveryService', () => {
  let service: CgspaceDiscoveryService;
  let httpService: { get: jest.Mock };
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  /** Which repository a request URL belongs to (base URLs are distinct per adapter). */
  function repositoryOf(url: string): KpRepository {
    const found = ALL.find((key) => url.startsWith(BASE_URLS[key]));
    if (!found) {
      throw new Error(`Unexpected upstream URL in test: ${url}`);
    }
    return found;
  }

  /**
   * Routes each upstream call to a per-repository behavior. Failures are **rejected promises**,
   * deferred so nothing rejects before subscription.
   */
  function mockSources(map: Partial<Record<KpRepository, SourceBehavior>>) {
    httpService.get.mockImplementation((url: string) => {
      const behavior = map[repositoryOf(url)];
      if (!behavior) {
        return of({ data: halPage(repositoryOf(url), []) });
      }
      if ('error' in behavior) {
        return defer(() => Promise.reject(behavior.error));
      }
      return of({ data: behavior.data });
    });
  }

  /** The single upstream call issued for `repository`, as `[url, config]`. */
  function callFor(repository: KpRepository): [string, any] {
    const call = httpService.get.mock.calls.find((args: any[]) =>
      String(args[0]).startsWith(BASE_URLS[repository]),
    );
    expect(call).toBeDefined();
    return call as [string, any];
  }

  function allLoggerCalls(): any[][] {
    return [...loggerLogSpy.mock.calls, ...loggerWarnSpy.mock.calls];
  }

  function searchEvent(): any {
    const call = loggerLogSpy.mock.calls.find(
      (args: any[]) => args[0]?.message === 'kp.discovery.search',
    );
    expect(call).toBeDefined();
    return call![0];
  }

  beforeEach(async () => {
    process.env.CGSPACE_DISCOVERY_URL = BASE_URLS.cgspace;
    process.env.MELSPACE_DISCOVERY_URL = BASE_URLS.melspace;
    process.env.WORLDFISH_DISCOVERY_URL = BASE_URLS.worldfish;

    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CgspaceDiscoveryService,
        CgspaceDiscoveryMapper,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get<CgspaceDiscoveryService>(CgspaceDiscoveryService);

    loggerLogSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    loggerWarnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.CGSPACE_DISCOVERY_URL;
    delete process.env.MELSPACE_DISCOVERY_URL;
    delete process.env.WORLDFISH_DISCOVERY_URL;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('escapeSolr', () => {
    it('should return empty string for empty, undefined, null or whitespace input', () => {
      expect(service.escapeSolr()).toBe('');
      expect(service.escapeSolr(undefined)).toBe('');
      expect(service.escapeSolr('')).toBe('');
      expect(service.escapeSolr('   ')).toBe('');
      expect(service.escapeSolr(null as any)).toBe('');
    });

    it('should strip leading wildcards * and ?', () => {
      expect(service.escapeSolr('*maize')).toBe('maize');
      expect(service.escapeSolr('?maize')).toBe('maize');
      expect(service.escapeSolr('***???maize')).toBe('maize');
      expect(service.escapeSolr('***')).toBe('');
      expect(service.escapeSolr('???')).toBe('');
    });

    it('should escape Solr special characters', () => {
      expect(service.escapeSolr('*:* OR (a"b)')).toBe('\\:\\* OR \\(a\\"b\\)');

      const complexInput =
        'title:beans +climate -drought (dry || wet) [2020 TO 2024] {opt} ^2 ~3 ?test *wild! \\slash';
      expect(service.escapeSolr(complexInput)).toBe(
        'title\\:beans \\+climate \\-drought \\(dry \\|\\| wet\\) \\[2020 TO 2024\\] \\{opt\\} \\^2 \\~3 \\?test \\*wild\\! \\\\slash',
      );
    });

    it('should escape characters without truncating query strings', () => {
      const longQuery = 'a'.repeat(300);
      expect(service.escapeSolr(longQuery).length).toBe(300);
    });
  });

  describe('search — fan-out, statuses and telemetry', () => {
    it('(a) three ok sources -> three upstream calls, each with its own base URL and adapter facet names, sources.length === 3', async () => {
      mockSources({
        cgspace: {
          data: halPage('cgspace', [
            { uuid: 'cg-1', handle: '10568/1', title: 'Maize in CGSpace' },
          ]),
        },
        melspace: {
          data: halPage('melspace', [
            {
              uuid: 'mel-1',
              handle: '20.500.11766/1',
              title: 'Maize in MELSpace',
            },
          ]),
        },
        worldfish: {
          data: halPage('worldfish', [
            {
              uuid: 'wf-1',
              handle: '20.500.12348/1',
              title: 'Maize in WorldFish',
            },
          ]),
        },
      });

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        type: 'Journal Article',
        center: 'Alliance of Bioversity and CIAT',
        year: '2026',
        repository: [...ALL],
      });

      expect(httpService.get).toHaveBeenCalledTimes(3);

      const [cgUrl, cgConfig] = callFor('cgspace');
      expect(cgUrl).toBe(`${BASE_URLS.cgspace}/discover/search/objects`);
      expect(cgConfig.timeout).toBe(8000);
      expect(cgConfig.params).toEqual({
        dsoType: 'item',
        page: 0,
        size: 10,
        query: 'maize',
        'f.itemtype': 'Journal Article,equals',
        'f.affiliation': 'Alliance of Bioversity and CIAT,equals',
        'f.dateIssued': '[2026 TO 2026],equals',
      });

      const [melUrl, melConfig] = callFor('melspace');
      expect(melUrl).toBe(`${BASE_URLS.melspace}/discover/search/objects`);
      // MELSpace's center facet is `institute`, not `affiliation` (design.md §3.3).
      expect(melConfig.params).toEqual({
        dsoType: 'item',
        page: 0,
        size: 10,
        query: 'maize',
        'f.itemtype': 'Journal Article,equals',
        'f.institute': 'Alliance of Bioversity and CIAT,equals',
        'f.dateIssued': '[2026 TO 2026],equals',
      });
      expect(melConfig.params['f.affiliation']).toBeUndefined();

      const [wfUrl, wfConfig] = callFor('worldfish');
      expect(wfUrl).toBe(`${BASE_URLS.worldfish}/discover/search/objects`);
      expect(wfConfig.params).toEqual({
        dsoType: 'item',
        page: 0,
        size: 10,
        query: 'maize',
        'f.itemtype': 'Journal Article,equals',
        'f.institute': 'Alliance of Bioversity and CIAT,equals',
        'f.dateIssued': '[2026 TO 2026],equals',
      });

      expect(result.status).toBe(200);
      expect(result.response.sources).toHaveLength(3);
      expect(result.response.sources.map((s) => s.repository)).toEqual(ALL);
      expect(result.response.sources.every((s) => s.status === 'ok')).toBe(
        true,
      );

      // Every item carries its own repository and that repository's item host (KPM-R-8).
      expect(result.response.items.map((i) => i.repository).sort()).toEqual([
        'cgspace',
        'melspace',
        'worldfish',
      ]);
      expect(
        result.response.items.find((i) => i.repository === 'melspace')!.itemUrl,
      ).toBe('https://repo.mel.cgiar.org/items/mel-1');

      expect(searchEvent()).toMatchObject({
        message: 'kp.discovery.search',
        repositories: ALL,
        merged: 3,
        dedupedCount: 0,
        page: 0,
        size: 10,
        hasQuery: true,
        outcome: 'success',
      });
      expect(searchEvent().sources).toEqual([
        {
          repository: 'cgspace',
          status: 'ok',
          durationMs: expect.any(Number),
          total: 1,
        },
        {
          repository: 'melspace',
          status: 'ok',
          durationMs: expect.any(Number),
          total: 1,
        },
        {
          repository: 'worldfish',
          status: 'ok',
          durationMs: expect.any(Number),
          total: 1,
        },
      ]);
    });

    it('(a2) a selection of two queries only those two sources, in selection order (scenario KPM-R-8)', async () => {
      mockSources({
        cgspace: {
          data: halPage('cgspace', [
            { uuid: 'cg-1', handle: '10568/1', title: 'Maize' },
          ]),
        },
        melspace: {
          data: halPage('melspace', [
            { uuid: 'mel-1', handle: '20.500.11766/1', title: 'Maiz' },
          ]),
        },
      });

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: ['cgspace', 'melspace'],
      });

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(result.response.sources.map((s) => s.repository)).toEqual([
        'cgspace',
        'melspace',
      ]);
      expect(
        httpService.get.mock.calls.some((args: any[]) =>
          String(args[0]).startsWith(BASE_URLS.worldfish),
        ),
      ).toBe(false);
    });

    it('(a3) without a query, every source gets sort=dc.date.accessioned,DESC instead of query', async () => {
      mockSources({});

      await service.search({
        type: 'Report',
        page: 1,
        size: 20,
        repository: ['cgspace', 'melspace'],
      });

      for (const repository of ['cgspace', 'melspace'] as KpRepository[]) {
        const [, config] = callFor(repository);
        expect(config.params.sort).toBe('dc.date.accessioned,DESC');
        expect(config.params.query).toBeUndefined();
        expect(config.params.page).toBe(1);
        expect(config.params.size).toBe(20);
      }
    });

    it('(a4) the query is Solr-escaped for every source', async () => {
      mockSources({});

      await service.search({
        query: '*:* OR (a"b)',
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      for (const repository of ALL) {
        const [, config] = callFor(repository);
        expect(config.params.query).toBe('\\:\\* OR \\(a\\"b\\)');
      }
    });

    it('(b) one source rejects with a timeout code -> HTTP 200, status "timeout", the other sources\' items are present', async () => {
      mockSources({
        cgspace: {
          data: halPage('cgspace', [
            { uuid: 'cg-1', handle: '10568/1', title: 'CGSpace item' },
          ]),
        },
        melspace: {
          data: halPage('melspace', [
            { uuid: 'mel-1', handle: '20.500.11766/1', title: 'MELSpace item' },
          ]),
        },
        worldfish: {
          error: {
            code: 'ECONNABORTED',
            message: `timeout of 8000ms exceeded at ${BASE_URLS.worldfish}`,
            config: { url: `${BASE_URLS.worldfish}/discover/search/objects` },
          },
        },
      });

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      expect(result.status).toBe(200);
      expect(result.response.sources).toEqual([
        { repository: 'cgspace', status: 'ok', total: 1, hasMore: false },
        { repository: 'melspace', status: 'ok', total: 1, hasMore: false },
        {
          repository: 'worldfish',
          status: 'timeout',
          total: 0,
          hasMore: false,
        },
      ]);
      expect(result.response.items.map((i) => i.title)).toEqual([
        'CGSpace item',
        'MELSpace item',
      ]);
      expect(loggerWarnSpy).toHaveBeenCalledWith({
        message: 'kp.discovery.source_failed',
        repository: 'worldfish',
        status: 'timeout',
      });
    });

    it('(b2) ETIMEDOUT and a bare "timeout" message classify as timeout; anything else as error', async () => {
      mockSources({
        cgspace: { error: { code: 'ETIMEDOUT', message: 'socket hang up' } },
        melspace: { error: { message: 'Timeout awaiting response' } },
        worldfish: {
          error: { code: 'ECONNREFUSED', message: 'connect refused' },
        },
      });

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      expect(result.response.sources.map((s) => s.status)).toEqual([
        'timeout',
        'timeout',
        'error',
      ]);
    });

    it('(c) one source returns 500 -> status "error", upstreamStatus logged as a number and nothing else', async () => {
      mockSources({
        cgspace: {
          data: halPage('cgspace', [
            { uuid: 'cg-1', handle: '10568/1', title: 'CGSpace item' },
          ]),
        },
        melspace: {
          error: {
            message: `Request failed with status code 500 at ${BASE_URLS.melspace}`,
            response: {
              status: 500,
              data: `Fatal Solr exception for ${BASE_URLS.melspace}`,
            },
          },
        },
        worldfish: {
          data: halPage('worldfish', [
            { uuid: 'wf-1', handle: '20.500.12348/1', title: 'WorldFish item' },
          ]),
        },
      });

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      expect(result.status).toBe(200);
      expect(
        result.response.sources.find((s) => s.repository === 'melspace'),
      ).toEqual({
        repository: 'melspace',
        status: 'error',
        total: 0,
        hasMore: false,
      });

      const failedWarn = loggerWarnSpy.mock.calls.find(
        (args: any[]) =>
          args[0]?.message === 'kp.discovery.source_failed' &&
          args[0]?.repository === 'melspace',
      );
      expect(failedWarn![0]).toEqual({
        message: 'kp.discovery.source_failed',
        repository: 'melspace',
        status: 'error',
        upstreamStatus: 500,
      });
      expect(typeof failedWarn![0].upstreamStatus).toBe('number');
      expect(searchEvent().outcome).toBe('partial');
    });

    it('(d) WORLDFISH_DISCOVERY_URL unset -> status "unconfigured", no HTTP call for it, exactly one warn (once per process)', async () => {
      delete process.env.WORLDFISH_DISCOVERY_URL;
      mockSources({});

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(
        httpService.get.mock.calls.some((args: any[]) =>
          String(args[0]).startsWith(BASE_URLS.worldfish),
        ),
      ).toBe(false);
      expect(
        result.response.sources.find((s) => s.repository === 'worldfish'),
      ).toEqual({
        repository: 'worldfish',
        status: 'unconfigured',
        total: 0,
        hasMore: false,
      });
      expect(result.status).toBe(200);

      const configWarns = loggerWarnSpy.mock.calls.filter(
        (args: any[]) => args[0]?.message === 'kp.discovery.config.missing',
      );
      expect(configWarns).toHaveLength(1);
      expect(configWarns[0][0]).toEqual({
        message: 'kp.discovery.config.missing',
        repository: 'worldfish',
      });

      // A second search does not warn again — once per process (design.md §4.1).
      await service.search({
        query: 'wheat',
        page: 0,
        size: 10,
        repository: [...ALL],
      });
      expect(
        loggerWarnSpy.mock.calls.filter(
          (args: any[]) => args[0]?.message === 'kp.discovery.config.missing',
        ),
      ).toHaveLength(1);
    });

    it('(d2) a blank env value is treated as unconfigured', async () => {
      process.env.MELSPACE_DISCOVERY_URL = '   ';
      mockSources({});

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: ['cgspace', 'melspace'],
      });

      expect(
        result.response.sources.find((s) => s.repository === 'melspace')!
          .status,
      ).toBe('unconfigured');
      expect(result.status).toBe(200);
    });

    it('(e) every selected source timeout/error -> the legacy 502 wrapper with generalized copy', async () => {
      mockSources({
        cgspace: { error: { code: 'ECONNABORTED', message: 'timeout' } },
        melspace: { error: { response: { status: 500 } } },
        worldfish: { error: { code: 'ECONNRESET', message: 'socket reset' } },
      });

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      expect(result.status).toBe(502);
      expect(result.message).toBe(
        'Repository search is temporarily unavailable',
      );
      expect(result.response.items).toEqual([]);
      expect(result.response.page).toEqual({
        number: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        hasMore: false,
      });
      expect(result.response.sources.map((s) => s.status)).toEqual([
        'timeout',
        'error',
        'error',
      ]);
      expect(searchEvent().outcome).toBe('failure');
    });

    it("(e′) every selected source unconfigured -> HTTP 200, items: [], three 'unconfigured' rows, no HTTP call", async () => {
      delete process.env.CGSPACE_DISCOVERY_URL;
      delete process.env.MELSPACE_DISCOVERY_URL;
      delete process.env.WORLDFISH_DISCOVERY_URL;

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      expect(httpService.get).not.toHaveBeenCalled();
      expect(result.status).toBe(200);
      expect(result.response.items).toEqual([]);
      expect(result.response.sources).toEqual([
        {
          repository: 'cgspace',
          status: 'unconfigured',
          total: 0,
          hasMore: false,
        },
        {
          repository: 'melspace',
          status: 'unconfigured',
          total: 0,
          hasMore: false,
        },
        {
          repository: 'worldfish',
          status: 'unconfigured',
          total: 0,
          hasMore: false,
        },
      ]);
      expect(searchEvent().outcome).toBe('unconfigured');

      // KPM-R-13: nothing in the body names the missing variable.
      const serialized = JSON.stringify(result);
      for (const envName of ENV_NAMES) {
        expect(serialized).not.toContain(envName);
      }
    });

    it('(e″) merged totalElements equals Σ ok totals − dedupedCount for one cross-source duplicate', async () => {
      mockSources({
        cgspace: {
          data: halPage(
            'cgspace',
            [
              {
                uuid: 'cg-1',
                handle: '10568/1',
                title: 'Shared knowledge product',
                doi: '10.1000/DUP',
              },
              { uuid: 'cg-2', handle: '10568/2', title: 'CGSpace only' },
            ],
            { totalElements: 18, totalPages: 2 },
          ),
        },
        melspace: {
          data: halPage(
            'melspace',
            [
              {
                uuid: 'mel-1',
                handle: '20.500.11766/1',
                title: 'Shared knowledge product',
                doi: 'https://doi.org/10.1000/dup',
              },
            ],
            { totalElements: 6, totalPages: 1 },
          ),
        },
      });

      const result = await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: ['cgspace', 'melspace'],
      });

      // One duplicate collapsed: 3 merged items -> 2 survivors.
      expect(result.response.items).toHaveLength(2);
      const survivor = result.response.items[0];
      expect(survivor.repository).toBe('cgspace');
      expect(survivor.alsoIn).toEqual([
        {
          repository: 'melspace',
          handle: '20.500.11766/1',
          handleUrl: 'https://hdl.handle.net/20.500.11766/1',
          itemUrl: 'https://repo.mel.cgiar.org/items/mel-1',
        },
      ]);

      expect(result.response.page.totalElements).toBe(18 + 6 - 1);
      expect(result.response.page.totalPages).toBe(2);
      expect(result.response.page.hasMore).toBe(true);
      expect(result.response.page.number).toBe(0);
      expect(result.response.page.size).toBe(10);

      // Per-source totals stay raw (never dedup-adjusted).
      expect(result.response.sources).toEqual([
        { repository: 'cgspace', status: 'ok', total: 18, hasMore: true },
        { repository: 'melspace', status: 'ok', total: 6, hasMore: false },
      ]);
      expect(searchEvent()).toMatchObject({ merged: 2, dedupedCount: 1 });
    });

    it('(e‴)/(g) after a mixed outcome the failed source is re-queried while the ok sources are served from cache', async () => {
      const dto: CgspaceSearchQueryDto = {
        query: 'maize',
        page: 0,
        size: 10,
        repository: [...ALL],
      };

      mockSources({
        cgspace: {
          data: halPage('cgspace', [
            { uuid: 'cg-1', handle: '10568/1', title: 'CGSpace item' },
          ]),
        },
        melspace: {
          data: halPage('melspace', [
            { uuid: 'mel-1', handle: '20.500.11766/1', title: 'MELSpace item' },
          ]),
        },
        worldfish: { error: { code: 'ECONNABORTED', message: 'timeout' } },
      });

      const first = await service.search(dto);
      expect(httpService.get).toHaveBeenCalledTimes(3);
      expect(
        first.response.sources.find((s) => s.repository === 'worldfish')!
          .status,
      ).toBe('timeout');

      // Only the ok sources are cached — the failure is never cached (KPM-DD-2).
      expect(service.searchCache.size).toBe(2);
      expect(
        [...service.searchCache.keys()].some((key) =>
          key.includes('"repository":"worldfish"'),
        ),
      ).toBe(false);
      expect(
        [...service.searchCache.keys()].filter(
          (key) =>
            key.includes('"repository":"cgspace"') ||
            key.includes('"repository":"melspace"'),
        ),
      ).toHaveLength(2);

      // WorldFish recovers; the identical retry re-queries it and only it.
      httpService.get.mockClear();
      mockSources({
        cgspace: { data: halPage('cgspace', []) },
        melspace: { data: halPage('melspace', []) },
        worldfish: {
          data: halPage('worldfish', [
            { uuid: 'wf-1', handle: '20.500.12348/1', title: 'WorldFish item' },
          ]),
        },
      });

      const second = await service.search(dto);

      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(String(httpService.get.mock.calls[0][0])).toBe(
        `${BASE_URLS.worldfish}/discover/search/objects`,
      );
      expect(second.response.sources.map((s) => s.status)).toEqual([
        'ok',
        'ok',
        'ok',
      ]);
      // The cached CGSpace/MELSpace items came back, not the (now empty) fresh responses.
      expect(second.response.items.map((i) => i.title)).toEqual([
        'CGSpace item',
        'MELSpace item',
        'WorldFish item',
      ]);
    });

    it('(g2) the search cache key is per source: a different selection reuses each cached source', async () => {
      mockSources({
        cgspace: {
          data: halPage('cgspace', [
            { uuid: 'cg-1', handle: '10568/1', title: 'CGSpace item' },
          ]),
        },
        melspace: {
          data: halPage('melspace', [
            { uuid: 'mel-1', handle: '20.500.11766/1', title: 'MELSpace item' },
          ]),
        },
      });

      await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: ['cgspace'],
      });
      expect(httpService.get).toHaveBeenCalledTimes(1);

      // CGSpace is served from cache; only MELSpace goes upstream.
      await service.search({
        query: 'maize',
        page: 0,
        size: 10,
        repository: ['cgspace', 'melspace'],
      });
      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(String(httpService.get.mock.calls[1][0])).toBe(
        `${BASE_URLS.melspace}/discover/search/objects`,
      );
    });

    it('(g3) cache expiry: an identical call after the 60 s TTL re-queries every source', async () => {
      jest.useFakeTimers();
      mockSources({});

      const dto: CgspaceSearchQueryDto = {
        query: 'maize',
        page: 0,
        size: 10,
        repository: ['cgspace'],
      };

      await service.search(dto);
      expect(httpService.get).toHaveBeenCalledTimes(1);

      await service.search(dto);
      expect(httpService.get).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(61_000);

      await service.search(dto);
      expect(httpService.get).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('(g4) search cache is bounded at 600 entries and evicts the oldest key', async () => {
      mockSources({});

      for (let i = 0; i < 600; i++) {
        await service.search({
          query: `query-${i}`,
          page: 0,
          size: 10,
          repository: ['cgspace'],
        });
      }
      expect(service.searchCache.size).toBe(600);

      const oldestKey = JSON.stringify({
        query: 'query-0',
        page: 0,
        size: 10,
        type: '',
        center: '',
        year: '',
        repository: 'cgspace',
      });
      expect(service.searchCache.has(oldestKey)).toBe(true);

      await service.search({
        query: 'query-600',
        page: 0,
        size: 10,
        repository: ['cgspace'],
      });
      expect(service.searchCache.size).toBe(600);
      expect(service.searchCache.has(oldestKey)).toBe(false);
    });

    it('(f) no upstream hostname, env var name or upstream body reaches the response or any log line', async () => {
      const rawQuery = 'very-sensitive-private-query';
      mockSources({
        cgspace: {
          error: {
            message: `Request failed with status code 500 at ${BASE_URLS.cgspace}?query=${rawQuery}`,
            config: { url: BASE_URLS.cgspace, params: { query: rawQuery } },
            response: {
              status: 500,
              data: `Fatal Solr exception for ${BASE_URLS.cgspace}`,
            },
          },
        },
        melspace: {
          error: {
            code: 'ECONNABORTED',
            message: `timeout of 8000ms exceeded at ${BASE_URLS.melspace}`,
            config: { url: BASE_URLS.melspace },
          },
        },
        worldfish: {
          error: {
            message: `getaddrinfo ENOTFOUND digitalarchive.worldfishcenter.org`,
            config: { url: BASE_URLS.worldfish },
          },
        },
      });

      const result = await service.search({
        query: rawQuery,
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      const serializedResponse = JSON.stringify(result);
      for (const hostname of [...HOSTNAMES, ...ENV_NAMES]) {
        expect(serializedResponse).not.toContain(hostname);
      }
      expect(serializedResponse).not.toContain(rawQuery);
      expect(serializedResponse).not.toContain('Solr');
      expect(result.message).toBe(
        'Repository search is temporarily unavailable',
      );

      for (const callArgs of allLoggerCalls()) {
        const serializedLog = JSON.stringify(callArgs);
        for (const hostname of [...HOSTNAMES, ...ENV_NAMES]) {
          expect(serializedLog).not.toContain(hostname);
        }
        expect(serializedLog).not.toContain(rawQuery);
        expect(serializedLog).not.toContain('Solr');
      }
    });

    it("(f2) on a partial failure the failed repository's hostname appears nowhere, and no env name leaks even though ok items carry their own item host", async () => {
      const rawQuery = 'another-private-query';
      mockSources({
        cgspace: {
          data: halPage('cgspace', [
            { uuid: 'cg-1', handle: '10568/1', title: 'CGSpace item' },
          ]),
        },
        melspace: { data: halPage('melspace', []) },
        worldfish: {
          error: {
            code: 'ECONNABORTED',
            message: `timeout of 8000ms exceeded at ${BASE_URLS.worldfish}`,
            response: {
              status: 504,
              data: `gateway timeout ${BASE_URLS.worldfish}`,
            },
          },
        },
      });

      const result = await service.search({
        query: rawQuery,
        page: 0,
        size: 10,
        repository: [...ALL],
      });

      const serializedResponse = JSON.stringify(result);
      // The failed source contributes nothing, so its host is absent from the body...
      expect(serializedResponse).not.toContain(
        'digitalarchive.worldfishcenter.org',
      );
      // ...while an ok item legitimately carries its own public item URL (KPM-R-8).
      expect(result.response.items[0].itemUrl).toBe(
        'https://cgspace.cgiar.org/items/cg-1',
      );
      for (const envName of ENV_NAMES) {
        expect(serializedResponse).not.toContain(envName);
      }

      // No log line may carry any hostname, env name or the query text.
      for (const callArgs of allLoggerCalls()) {
        const serializedLog = JSON.stringify(callArgs);
        for (const hostname of [...HOSTNAMES, ...ENV_NAMES]) {
          expect(serializedLog).not.toContain(hostname);
        }
        expect(serializedLog).not.toContain(rawQuery);
      }
      expect(searchEvent().hasQuery).toBe(true);
    });

    it('(f3) Promise.allSettled is load-bearing: a rejecting source never rejects search()', async () => {
      mockSources({
        cgspace: {
          data: halPage('cgspace', [
            { uuid: 'cg-1', handle: '10568/1', title: 'CGSpace item' },
          ]),
        },
        melspace: { error: { response: { status: 503 } } },
        worldfish: { error: { code: 'ECONNABORTED', message: 'timeout' } },
      });

      await expect(
        service.search({
          query: 'maize',
          page: 0,
          size: 10,
          repository: [...ALL],
        }),
      ).resolves.toMatchObject({ status: 200 });
    });
  });

  describe('facets — union across repositories', () => {
    it('(h) two sources with "Journal Article" / "journal article" -> one value, counts summed, repositories listed', async () => {
      mockSources({
        cgspace: {
          data: facetHal([
            { label: 'Journal Article', count: 12000 },
            { label: 'Book Chapter', count: 3500 },
          ]),
        },
        melspace: {
          data: facetHal([
            { label: 'journal article', count: 40 },
            { label: 'Brief', count: 9 },
          ]),
        },
      });

      const result = await service.facets('itemtype', {
        size: 50,
        repository: ['cgspace', 'melspace'],
      });

      expect(result.status).toBe(200);
      expect(result.message).toBe('Repository facet results');
      expect(result.response.values).toHaveLength(3);
      expect(result.response.values[0]).toEqual({
        label: 'Journal Article',
        value: 'Journal Article',
        count: 12040,
        repositories: ['cgspace', 'melspace'],
      });
      expect(result.response.values[1]).toEqual({
        label: 'Book Chapter',
        value: 'Book Chapter',
        count: 3500,
        repositories: ['cgspace'],
      });
      expect(result.response.values[2]).toEqual({
        label: 'Brief',
        value: 'Brief',
        count: 9,
        repositories: ['melspace'],
      });
      expect(result.response.sources).toEqual([
        { repository: 'cgspace', status: 'ok', total: 2, hasMore: false },
        { repository: 'melspace', status: 'ok', total: 2, hasMore: false },
      ]);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'kp.discovery.facets',
          name: 'itemtype',
          repositories: ['cgspace', 'melspace'],
          total: 3,
          outcome: 'success',
        }),
      );
    });

    it('(h2) each source is asked for its own physical facet name (affiliation vs institute)', async () => {
      mockSources({
        cgspace: { data: facetHal([{ label: 'IITA', count: 10 }]) },
        melspace: { data: facetHal([{ label: 'ICARDA', count: 5 }]) },
        worldfish: { data: facetHal([{ label: 'WorldFish', count: 2 }]) },
      });

      await service.facets('affiliation', { size: 50, repository: [...ALL] });

      expect(callFor('cgspace')[0]).toBe(
        `${BASE_URLS.cgspace}/discover/facets/affiliation`,
      );
      expect(callFor('melspace')[0]).toBe(
        `${BASE_URLS.melspace}/discover/facets/institute`,
      );
      expect(callFor('worldfish')[0]).toBe(
        `${BASE_URLS.worldfish}/discover/facets/institute`,
      );
      expect(callFor('cgspace')[1].params).toEqual({ size: 50 });
      expect(callFor('cgspace')[1].timeout).toBe(8000);
    });

    it('(h3) one facet source failing yields the union of the others with HTTP 200', async () => {
      mockSources({
        cgspace: {
          data: facetHal([{ label: 'Journal Article', count: 12000 }]),
        },
        melspace: { data: facetHal([{ label: 'Journal Article', count: 40 }]) },
        worldfish: {
          error: {
            response: { status: 500 },
            message: `Request failed at ${BASE_URLS.worldfish}`,
          },
        },
      });

      const result = await service.facets('itemtype', {
        size: 50,
        repository: [...ALL],
      });

      expect(result.status).toBe(200);
      expect(result.response.values).toEqual([
        {
          label: 'Journal Article',
          value: 'Journal Article',
          count: 12040,
          repositories: ['cgspace', 'melspace'],
        },
      ]);
      expect(result.response.sources.map((s) => s.status)).toEqual([
        'ok',
        'ok',
        'error',
      ]);
      expect(loggerWarnSpy).toHaveBeenCalledWith({
        message: 'kp.discovery.source_failed',
        repository: 'worldfish',
        status: 'error',
        upstreamStatus: 500,
      });

      for (const callArgs of allLoggerCalls()) {
        const serializedLog = JSON.stringify(callArgs);
        for (const hostname of [...HOSTNAMES, ...ENV_NAMES]) {
          expect(serializedLog).not.toContain(hostname);
        }
      }
    });

    it("(h4) the facet cache key includes the repository — one source never serves another's values", async () => {
      mockSources({
        cgspace: {
          data: facetHal([{ label: 'Journal Article', count: 12000 }]),
        },
        melspace: { data: facetHal([{ label: 'Brief', count: 7 }]) },
      });

      const dto: CgspaceFacetQueryDto = {
        prefix: 'J',
        size: 10,
        repository: ['cgspace'],
      };
      await service.facets('itemtype', dto);
      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(service.facetCache.size).toBe(1);
      expect([...service.facetCache.keys()][0]).toBe(
        JSON.stringify({
          name: 'itemtype',
          prefix: 'J',
          size: 10,
          repository: 'cgspace',
        }),
      );

      // Same (name, prefix, size) but a different repository must NOT hit the cache.
      const result = await service.facets('itemtype', {
        prefix: 'J',
        size: 10,
        repository: ['melspace'],
      });
      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(result.response.values).toEqual([
        {
          label: 'Brief',
          value: 'Brief',
          count: 7,
          repositories: ['melspace'],
        },
      ]);
      expect(service.facetCache.size).toBe(2);

      // And the identical call is served from cache.
      await service.facets('itemtype', dto);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('(h5) only ok facet results are cached; a failed source is re-queried on the next call', async () => {
      mockSources({
        cgspace: { data: facetHal([{ label: 'Journal Article', count: 1 }]) },
        melspace: { error: { code: 'ECONNABORTED', message: 'timeout' } },
      });

      await service.facets('itemtype', {
        size: 50,
        repository: ['cgspace', 'melspace'],
      });
      expect(service.facetCache.size).toBe(1);
      expect(
        [...service.facetCache.keys()].some((key) =>
          key.includes('"repository":"melspace"'),
        ),
      ).toBe(false);

      httpService.get.mockClear();
      await service.facets('itemtype', {
        size: 50,
        repository: ['cgspace', 'melspace'],
      });
      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(String(httpService.get.mock.calls[0][0])).toBe(
        `${BASE_URLS.melspace}/discover/facets/itemtype`,
      );
    });

    it('(h6) facet cache is bounded at 60 entries', async () => {
      mockSources({ cgspace: { data: facetHal([{ label: 'X', count: 1 }]) } });

      for (let i = 0; i < 60; i++) {
        await service.facets('itemtype', {
          prefix: `P-${i}`,
          size: 10,
          repository: ['cgspace'],
        });
      }
      expect(service.facetCache.size).toBe(60);

      const oldestKey = JSON.stringify({
        name: 'itemtype',
        prefix: 'P-0',
        size: 10,
        repository: 'cgspace',
      });
      expect(service.facetCache.has(oldestKey)).toBe(true);

      await service.facets('itemtype', {
        prefix: 'P-60',
        size: 10,
        repository: ['cgspace'],
      });
      expect(service.facetCache.size).toBe(60);
      expect(service.facetCache.has(oldestKey)).toBe(false);
    });

    it('(h7) an unknown facet name is rejected with 400 before any upstream call', async () => {
      const result = await service.facets('country', {
        size: 50,
        repository: [...ALL],
      });

      expect(result).toEqual({
        response: { name: 'country', values: [], sources: [] },
        message: "Invalid facet 'country'. Allowed: itemtype, affiliation",
        status: 400,
      });
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('(h8) every facet source failing keeps the legacy 502 wrapper; every source unconfigured stays 200', async () => {
      mockSources({
        cgspace: { error: { response: { status: 500 } } },
        melspace: { error: { code: 'ECONNABORTED', message: 'timeout' } },
      });

      const failed = await service.facets('itemtype', {
        size: 50,
        repository: ['cgspace', 'melspace'],
      });
      expect(failed.status).toBe(502);
      expect(failed.message).toBe(
        'Repository search is temporarily unavailable',
      );
      expect(failed.response.values).toEqual([]);
      expect(failed.response.sources.map((s) => s.status)).toEqual([
        'error',
        'timeout',
      ]);

      delete process.env.CGSPACE_DISCOVERY_URL;
      delete process.env.MELSPACE_DISCOVERY_URL;
      const unconfigured = await service.facets('itemtype', {
        size: 50,
        repository: ['cgspace', 'melspace'],
      });
      expect(unconfigured.status).toBe(200);
      expect(unconfigured.response.values).toEqual([]);
      expect(unconfigured.response.sources.map((s) => s.status)).toEqual([
        'unconfigured',
        'unconfigured',
      ]);
    });
  });
});
