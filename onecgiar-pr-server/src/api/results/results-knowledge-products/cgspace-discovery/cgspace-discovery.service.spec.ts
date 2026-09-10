import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { CgspaceDiscoveryService } from './cgspace-discovery.service';
import { CgspaceDiscoveryMapper } from './cgspace-discovery.mapper';
import { CgspaceSearchQueryDto } from './dto/cgspace-search-query.dto';
import { CgspaceFacetQueryDto } from './dto/cgspace-facet-query.dto';

describe('CgspaceDiscoveryService', () => {
  let service: CgspaceDiscoveryService;
  let httpService: { get: jest.Mock };
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let halFixture: any;

  beforeAll(() => {
    const fixturePath = path.resolve(
      __dirname,
      'fixtures/cgspace-search.hal.json',
    );
    halFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  });

  beforeEach(async () => {
    process.env.CGSPACE_DISCOVERY_URL = 'https://cgspace.cgiar.org/server/api';

    httpService = {
      get: jest.fn(),
    };

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
      // input: *:* OR (a"b) -> leading * stripped -> :* OR (a"b) -> escaped -> \:\* OR \(a\"b\)
      expect(service.escapeSolr('*:* OR (a"b)')).toBe('\\:\\* OR \\(a\\"b\\)');

      const complexInput =
        'title:beans +climate -drought (dry || wet) [2020 TO 2024] {opt} ^2 ~3 ?test *wild! \\slash';
      const escaped = service.escapeSolr(complexInput);
      expect(escaped).toBe(
        'title\\:beans \\+climate \\-drought \\(dry \\|\\| wet\\) \\[2020 TO 2024\\] \\{opt\\} \\^2 \\~3 \\?test \\*wild\\! \\\\slash',
      );
    });

    it('should escape characters without truncating query strings', () => {
      const longQuery = 'a'.repeat(300);
      const escaped = service.escapeSolr(longQuery);
      expect(escaped.length).toBe(300);
      expect(escaped).toBe('a'.repeat(300));
    });
  });

  describe('search', () => {
    const defaultSearchDto: CgspaceSearchQueryDto = {
      query: 'maize',
      page: 0,
      size: 10,
    };

    it('1. Successful search with query -> returns 200 and mapped items', async () => {
      httpService.get.mockReturnValueOnce(of({ data: halFixture }));

      const result = await service.search(defaultSearchDto);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://cgspace.cgiar.org/server/api/discover/search/objects',
        {
          params: {
            dsoType: 'item',
            page: 0,
            size: 10,
            query: 'maize',
          },
          paramsSerializer: {
            encode: expect.any(Function),
          },
          timeout: 8000,
        },
      );

      expect(result.status).toBe(200);
      expect(result.message).toBe('CGSpace search results');
      expect(result.response.items).toHaveLength(3);
      expect(result.response.items[0]).toMatchObject({
        uuid: '679513e4-eeba-4a06-a017-015862e7b9b3',
        handle: '10568/74449',
        handleUrl: 'https://hdl.handle.net/10568/74449',
        itemUrl:
          'https://cgspace.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3',
        title: expect.stringContaining('Effect of Lablab purpureus'),
        type: 'Journal Article',
        year: 2015,
      });
      expect(result.response.page).toEqual({
        number: 0,
        size: 3,
        totalElements: 3,
        totalPages: 1,
      });

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'cgspace.search',
          queryLength: 5,
          page: 0,
          size: 10,
          hasType: false,
          hasCenter: false,
          outcome: 'success',
          total: 3,
        }),
      );
    });

    it('2. Successful search without query -> sends sort: dc.date.accessioned,DESC', async () => {
      httpService.get.mockReturnValueOnce(of({ data: halFixture }));

      const dto: CgspaceSearchQueryDto = {
        type: 'Journal Article',
        page: 1,
        size: 20,
      };

      const result = await service.search(dto);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://cgspace.cgiar.org/server/api/discover/search/objects',
        {
          params: {
            dsoType: 'item',
            page: 1,
            size: 20,
            sort: 'dc.date.accessioned,DESC',
            'f.itemtype': 'Journal Article,equals',
          },
          paramsSerializer: {
            encode: expect.any(Function),
          },
          timeout: 8000,
        },
      );

      expect(result.status).toBe(200);
      expect(result.message).toBe('CGSpace search results');
    });

    it('3. Filters applied: type, center, year mapped to f.itemtype, f.affiliation, f.dateIssued=[YYYY TO YYYY],equals', async () => {
      httpService.get.mockReturnValueOnce(of({ data: halFixture }));

      const dto: CgspaceSearchQueryDto = {
        query: 'cassava',
        type: 'Journal Article',
        center: 'Alliance of Bioversity and CIAT',
        year: '2024',
        page: 0,
        size: 10,
      };

      const result = await service.search(dto);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://cgspace.cgiar.org/server/api/discover/search/objects',
        {
          params: {
            dsoType: 'item',
            page: 0,
            size: 10,
            query: 'cassava',
            'f.itemtype': 'Journal Article,equals',
            'f.affiliation': 'Alliance of Bioversity and CIAT,equals',
            'f.dateIssued': '[2024 TO 2024],equals',
          },
          paramsSerializer: {
            encode: expect.any(Function),
          },
          timeout: 8000,
        },
      );

      expect(result.status).toBe(200);
    });

    it('4. Solr escaping: input *:* OR (a"b) -> escaped query sent', async () => {
      httpService.get.mockReturnValueOnce(of({ data: halFixture }));

      const dto: CgspaceSearchQueryDto = {
        query: '*:* OR (a"b)',
        page: 0,
        size: 10,
      };

      const result = await service.search(dto);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://cgspace.cgiar.org/server/api/discover/search/objects',
        expect.objectContaining({
          params: expect.objectContaining({
            query: '\\:\\* OR \\(a\\"b\\)',
          }),
        }),
      );

      expect(result.status).toBe(200);
    });

    it('5. Cache hit: second call with same query within 60s returns cached result without second HTTP call', async () => {
      httpService.get.mockReturnValueOnce(of({ data: halFixture }));

      const firstCall = await service.search(defaultSearchDto);
      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(firstCall.status).toBe(200);

      // Second call within TTL
      const secondCall = await service.search(defaultSearchDto);
      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(secondCall).toEqual(firstCall);

      // Call with different params causes fresh HTTP fetch
      httpService.get.mockReturnValueOnce(of({ data: halFixture }));
      const differentDto: CgspaceSearchQueryDto = {
        query: 'wheat',
        page: 0,
        size: 10,
      };
      const thirdCall = await service.search(differentDto);
      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(thirdCall.status).toBe(200);
    });

    it('5b. Cache expiry: call after 60s re-fetches from upstream', async () => {
      jest.useFakeTimers();
      httpService.get.mockReturnValue(of({ data: halFixture }));

      await service.search(defaultSearchDto);
      expect(httpService.get).toHaveBeenCalledTimes(1);

      // Advance time by 61 seconds
      jest.advanceTimersByTime(61_000);

      await service.search(defaultSearchDto);
      expect(httpService.get).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('6. Cache eviction: inserting 201st search key evicts oldest', async () => {
      httpService.get.mockReturnValue(of({ data: halFixture }));

      // Fill cache with 200 entries
      for (let i = 0; i < 200; i++) {
        await service.search({ query: `query-${i}`, page: 0, size: 10 });
      }
      expect(service.searchCache.size).toBe(200);
      expect(httpService.get).toHaveBeenCalledTimes(200);

      // 1st entry (query-0) should currently be in cache
      expect(
        service.searchCache.has(
          JSON.stringify({
            query: 'query-0',
            page: 0,
            size: 10,
            type: '',
            center: '',
            year: '',
            repository: 'cgspace',
          }),
        ),
      ).toBe(true);

      // Insert 201st entry (query-200)
      await service.search({ query: 'query-200', page: 0, size: 10 });
      expect(service.searchCache.size).toBe(200);
      expect(httpService.get).toHaveBeenCalledTimes(201);

      // query-0 must have been evicted (oldest key)
      expect(
        service.searchCache.has(
          JSON.stringify({
            query: 'query-0',
            page: 0,
            size: 10,
            type: '',
            center: '',
            year: '',
            repository: 'cgspace',
          }),
        ),
      ).toBe(false);

      // query-1 and query-200 should be in cache
      expect(
        service.searchCache.has(
          JSON.stringify({
            query: 'query-1',
            page: 0,
            size: 10,
            type: '',
            center: '',
            year: '',
            repository: 'cgspace',
          }),
        ),
      ).toBe(true);
      expect(
        service.searchCache.has(
          JSON.stringify({
            query: 'query-200',
            page: 0,
            size: 10,
            type: '',
            center: '',
            year: '',
            repository: 'cgspace',
          }),
        ),
      ).toBe(true);
    });

    it('7. Upstream timeout / 500 / network error -> returns 502 wrapper with generic message (never throws)', async () => {
      const networkError = new Error('connect ECONNREFUSED 127.0.0.1:443');
      httpService.get.mockReturnValueOnce(throwError(() => networkError));

      const result = await service.search(defaultSearchDto);

      expect(result).toEqual({
        response: {
          items: [],
          page: {
            number: 0,
            size: 10,
            totalElements: 0,
            totalPages: 0,
          },
        },
        message: 'CGSpace search is temporarily unavailable',
        status: 502,
      });

      // 500 status error
      const server500Error = {
        response: {
          status: 500,
          data: { error: 'Internal server error in DSpace Solr' },
        },
      };
      httpService.get.mockReturnValueOnce(throwError(() => server500Error));

      const result500 = await service.search({
        query: 'wheat',
        page: 1,
        size: 5,
      });

      expect(result500).toEqual({
        response: {
          items: [],
          page: {
            number: 1,
            size: 5,
            totalElements: 0,
            totalPages: 0,
          },
        },
        message: 'CGSpace search is temporarily unavailable',
        status: 502,
      });
    });

    it('8. Upstream 404 / 4xx -> returns 502 and logs cgspace.search.upstream_4xx with status', async () => {
      const http404Error = {
        response: {
          status: 404,
          data: { message: 'Not Found' },
        },
      };
      httpService.get.mockReturnValueOnce(throwError(() => http404Error));

      const result = await service.search(defaultSearchDto);

      expect(result.status).toBe(502);
      expect(result.message).toBe('CGSpace search is temporarily unavailable');
      expect(result.response.items).toEqual([]);

      expect(loggerWarnSpy).toHaveBeenCalledWith({
        message: 'cgspace.search.upstream_4xx',
        status: 404,
      });
    });

    it('9. Security / No-leak assertion: Inspect all logger calls and returned 502 payload under JSON.stringify()', async () => {
      const secretUrl =
        'https://cgspace.cgiar.org/server/api/discover/search/objects';
      const rawQuery = 'very-sensitive-private-query';
      const axiosError = {
        message: `Request failed with status code 500 at ${secretUrl}?query=${rawQuery}`,
        config: { url: secretUrl, params: { query: rawQuery } },
        response: {
          status: 500,
          data: `Fatal Solr exception for ${secretUrl}`,
        },
      };

      httpService.get.mockReturnValueOnce(throwError(() => axiosError));

      const result = await service.search({
        query: rawQuery,
        page: 0,
        size: 10,
      });

      const serializedResponse = JSON.stringify(result);
      expect(serializedResponse).not.toContain('cgspace.cgiar.org');
      expect(serializedResponse).not.toContain(rawQuery);
      expect(serializedResponse).not.toContain('Solr');

      // Check all logger invocations
      const allLogCalls = [
        ...loggerLogSpy.mock.calls,
        ...loggerWarnSpy.mock.calls,
      ];
      for (const callArgs of allLogCalls) {
        const serializedLog = JSON.stringify(callArgs);
        expect(serializedLog).not.toContain('cgspace.cgiar.org');
        expect(serializedLog).not.toContain(rawQuery);
      }
    });

    it('handles missing or empty CGSPACE_DISCOVERY_URL gracefully', async () => {
      delete process.env.CGSPACE_DISCOVERY_URL;

      const resultUndefined = await service.search(defaultSearchDto);

      expect(httpService.get).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith('cgspace.config.missing');
      expect(resultUndefined.status).toBe(502);
      expect(resultUndefined.message).toBe(
        'CGSpace search is temporarily unavailable',
      );

      loggerWarnSpy.mockClear();
      process.env.CGSPACE_DISCOVERY_URL = '   ';

      const resultWhitespace = await service.search(defaultSearchDto);
      expect(loggerWarnSpy).toHaveBeenCalledWith('cgspace.config.missing');
      expect(resultWhitespace.status).toBe(502);
      expect(resultWhitespace.message).toBe(
        'CGSpace search is temporarily unavailable',
      );
    });
  });

  describe('facets', () => {
    const mockItemTypeHalResponse = {
      _embedded: {
        values: [
          { label: 'Journal Article', count: 12000 },
          { label: 'Book Chapter', count: 3500 },
          { label: 'Working Paper', count: 1800 },
        ],
      },
    };

    const mockAffiliationHalResponse = {
      _embedded: {
        values: [
          {
            label: 'International Institute of Tropical Agriculture',
            count: 5400,
          },
          {
            label: 'Alliance of Bioversity International and CIAT',
            count: 4200,
          },
        ],
      },
    };

    it('10. Facets success for itemtype and affiliation', async () => {
      httpService.get.mockReturnValueOnce(
        of({ data: mockItemTypeHalResponse }),
      );

      const itemTypeDto: CgspaceFacetQueryDto = {
        prefix: 'Jour',
        size: 10,
      };

      const itemTypeResult = await service.facets('itemtype', itemTypeDto);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://cgspace.cgiar.org/server/api/discover/facets/itemtype',
        {
          params: {
            prefix: 'Jour',
            size: 10,
          },
          paramsSerializer: {
            encode: expect.any(Function),
          },
          timeout: 8000,
        },
      );

      expect(itemTypeResult).toEqual({
        response: {
          name: 'itemtype',
          values: [
            {
              label: 'Journal Article',
              value: 'Journal Article',
              count: 12000,
            },
            { label: 'Book Chapter', value: 'Book Chapter', count: 3500 },
            { label: 'Working Paper', value: 'Working Paper', count: 1800 },
          ],
        },
        message: 'CGSpace facet results',
        status: 200,
      });

      // Affiliation facet
      httpService.get.mockReturnValueOnce(
        of({ data: mockAffiliationHalResponse }),
      );
      const affDto: CgspaceFacetQueryDto = { size: 50 };
      const affResult = await service.facets('affiliation', affDto);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://cgspace.cgiar.org/server/api/discover/facets/affiliation',
        {
          params: {
            size: 50,
          },
          paramsSerializer: {
            encode: expect.any(Function),
          },
          timeout: 8000,
        },
      );

      expect(affResult.status).toBe(200);
      expect(affResult.response.name).toBe('affiliation');
      expect(affResult.response.values).toHaveLength(2);
      expect(affResult.response.values[0]).toEqual({
        label: 'International Institute of Tropical Agriculture',
        value: 'International Institute of Tropical Agriculture',
        count: 5400,
      });
    });

    it('10b. Facets cache hit works within 10 min TTL and evicts oldest at 20 entries', async () => {
      httpService.get.mockReturnValue(of({ data: mockItemTypeHalResponse }));

      const dto: CgspaceFacetQueryDto = { prefix: 'A', size: 10 };
      const first = await service.facets('itemtype', dto);
      expect(httpService.get).toHaveBeenCalledTimes(1);

      const second = await service.facets('itemtype', dto);
      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);

      // Test facet cache eviction on 21st key (max 20 entries)
      for (let i = 0; i < 20; i++) {
        await service.facets('itemtype', { prefix: `P-${i}`, size: 10 });
      }
      expect(service.facetCache.size).toBe(20);

      // Original 'A' key should have been evicted
      expect(
        service.facetCache.has(
          JSON.stringify({ name: 'itemtype', prefix: 'A', size: 10 }),
        ),
      ).toBe(false);
    });

    it('11. Facets error handling and invalid facet name', async () => {
      // Invalid facet name
      const invalidResult = await service.facets('country', { size: 50 });
      expect(invalidResult).toEqual({
        response: { name: 'country', values: [] },
        message: "Invalid facet 'country'. Allowed: itemtype, affiliation",
        status: 400,
      });
      expect(httpService.get).not.toHaveBeenCalled();

      // Upstream 500 error
      const error500 = { response: { status: 500 } };
      httpService.get.mockReturnValueOnce(throwError(() => error500));

      const errorResult = await service.facets('itemtype', { size: 50 });
      expect(errorResult).toEqual({
        response: { name: 'itemtype', values: [] },
        message: 'CGSpace search is temporarily unavailable',
        status: 502,
      });

      // Upstream 4xx error
      const error404 = { response: { status: 404 } };
      httpService.get.mockReturnValueOnce(throwError(() => error404));

      const error4xxResult = await service.facets('affiliation', { size: 50 });
      expect(error4xxResult.status).toBe(502);
      expect(loggerWarnSpy).toHaveBeenCalledWith({
        message: 'cgspace.facets.upstream_4xx',
        status: 404,
      });
    });

    it('facets handles missing or empty CGSPACE_DISCOVERY_URL gracefully', async () => {
      delete process.env.CGSPACE_DISCOVERY_URL;

      const resultUndefined = await service.facets('itemtype', { size: 50 });

      expect(httpService.get).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith('cgspace.config.missing');
      expect(resultUndefined.status).toBe(502);
      expect(resultUndefined.message).toBe(
        'CGSpace search is temporarily unavailable',
      );

      loggerWarnSpy.mockClear();
      process.env.CGSPACE_DISCOVERY_URL = '';

      const resultEmpty = await service.facets('itemtype', { size: 50 });
      expect(loggerWarnSpy).toHaveBeenCalledWith('cgspace.config.missing');
      expect(resultEmpty.status).toBe(502);
      expect(resultEmpty.message).toBe(
        'CGSpace search is temporarily unavailable',
      );
    });
  });
});
