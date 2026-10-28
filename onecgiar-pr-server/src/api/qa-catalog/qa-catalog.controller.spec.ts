// @akili-spec quality-assurance/qa-field-catalog
import 'reflect-metadata';
import { INestApplication, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BILATERAL_CLARISA_ENDPOINT_KEY } from '../bilateral/decorators/bilateral-clarisa-endpoint.decorator';
import { ClarisaApiKeyGuard } from '../bilateral/guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationService } from '../bilateral/services/clarisa-api-key-validation.service';
import { QaCatalogController } from './qa-catalog.controller';
import { QaCatalogService } from './qa-catalog.service';
import { QaResultsService } from './qa-results.service';
import { FIXTURE_SOURCE } from './qa-catalog.fixtures';

const API_KEY = 'unit-test-key-value';

describe('QaCatalogController', () => {
  let app: INestApplication;
  const validate = jest.fn();
  const list = jest.fn();
  const details = jest.fn();

  // The 200 precondition must not depend on the (still empty) code catalog: the controller is
  // wired to the real service, but that service reads FIXTURE_SOURCE (see the real-catalog
  // describe below for the unmodified code catalog).
  const fixtureService = new QaCatalogService();
  const useRealCatalog = { value: false };
  const catalogProvider = {
    provide: QaCatalogService,
    useValue: {
      getCatalog: (year: number) =>
        useRealCatalog.value
          ? fixtureService.getCatalog(year)
          : fixtureService.getCatalog(year, FIXTURE_SOURCE),
    },
  };

  beforeEach(async () => {
    useRealCatalog.value = false;
    validate.mockReset();
    list.mockReset();
    details.mockReset();
    details.mockResolvedValue({
      phase: 2026,
      catalog_version: '2026.3',
      results: [],
      not_eligible: [],
    });
    list.mockResolvedValue({
      phase: 2026,
      page: 1,
      page_size: 100,
      total: 0,
      breakdown: { by_program: [], by_result_type: [] },
      items: [],
    });
    validate.mockResolvedValue({ mis: { acronym: 'QA' } });
    const moduleRef = await Test.createTestingModule({
      controllers: [QaCatalogController],
      providers: [
        catalogProvider,
        { provide: QaResultsService, useValue: { list, details } },
        ClarisaApiKeyGuard,
        { provide: ClarisaApiKeyValidationService, useValue: { validate } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const get = (qs: string, headers: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(`/catalog${qs}`)
      .set({ 'x-api-key': API_KEY, ...headers });

  describe('route resolves with a valid credential (precondition for the 401 cases)', () => {
    it('valid year -> 200 with the contract body', async () => {
      const res = await get('?phase_year=2026');
      expect(res.status).toBe(200);
      expect(res.body.phase).toBe(2026);
      expect(res.body.portfolio).toBe('P25');
      expect(res.body.catalog_version).toBe('2026.3');
      expect(res.body.fields.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.fields)).toBe(true);
      expect(validate).toHaveBeenCalledWith(
        API_KEY,
        '/api/qa/catalog',
        expect.anything(),
      );
    });
  });

  describe('QAC-R-9 statuses', () => {
    it('missing phase_year -> 400', async () => {
      expect((await get('')).status).toBe(400);
    });
    it.each(['abc', '', '2026.5', '-1', '20x6'])(
      'phase_year=%p -> 400',
      async (v) => {
        expect((await get(`?phase_year=${v}`)).status).toBe(400);
      },
    );
    it('year not catalogued (2023) -> 404, not an empty 200', async () => {
      const res = await get('?phase_year=2023');
      expect(res.status).toBe(404);
      expect(res.body.fields).toBeUndefined();
      expect(res.body.message).toBe(
        'No QA catalog available for phase_year 2023',
      );
    });
    it('2026 against the real code catalog -> 200 with the common sections (QAC-T-8)', async () => {
      useRealCatalog.value = true;
      const res = await get('?phase_year=2026');
      expect(res.status).toBe(200);
      expect(res.body.catalog_version).toBe('2026.30');
      const keys = res.body.fields.map((f: { key: string }) => f.key);
      expect(keys).toEqual(
        expect.arrayContaining([
          'general.title',
          'geo.scope',
          'evidence.items',
          'partners.not_applicable',
        ]),
      );
      // QAC-R-4 against the real catalog: no storage binding or table name leaks.
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('"storage"');
      expect(body).not.toContain('fk_to_result');
      expect(body).not.toContain('results_toc_result');
    });
    it('an undeclared year against the real code catalog -> 404, not an empty 200', async () => {
      useRealCatalog.value = true;
      const res = await get('?phase_year=2023');
      expect(res.status).toBe(404);
      expect(res.body.fields).toBeUndefined();
      expect(res.body.message).toBe(
        'No QA catalog available for phase_year 2023',
      );
    });
  });

  describe('QAC-R-10 credential', () => {
    it('no x-api-key -> 401 and CLARISA is never asked', async () => {
      const res = await request(app.getHttpServer()).get(
        '/catalog?phase_year=2026',
      );
      expect(res.status).toBe(401);
      expect(validate).not.toHaveBeenCalled();
    });

    it('user JWT in the auth header is not a substitute -> 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/catalog?phase_year=2026')
        .set('auth', 'eyJhbGciOiJIUzI1NiJ9.e30.sig')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig');
      expect(res.status).toBe(401);
      expect(validate).not.toHaveBeenCalled();
    });

    it('key rejected by CLARISA -> 401 with a body that does not echo the key', async () => {
      validate.mockResolvedValue(null);
      const res = await get('?phase_year=2026');
      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).not.toContain(API_KEY);
    });

    it('never writes the credential to stdout/stderr or the Nest Logger', async () => {
      const sinks = [
        jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
        jest.spyOn(Logger.prototype, 'log').mockImplementation(),
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(),
        jest.spyOn(Logger.prototype, 'error').mockImplementation(),
      ];
      await get('?phase_year=2026');
      validate.mockResolvedValue(null);
      await get('?phase_year=2026');
      const written = sinks.map((s) => JSON.stringify(s.mock.calls));
      sinks.forEach((s) => s.mockRestore());
      written.forEach((w) => expect(w).not.toContain(API_KEY));
    });
  });

  describe('guard metadata (QAC-R-10, DD-6)', () => {
    it("handler declares @BilateralClarisaEndpoint('/api/qa/catalog')", () => {
      expect(
        Reflect.getMetadata(
          BILATERAL_CLARISA_ENDPOINT_KEY,
          QaCatalogController.prototype.getCatalog,
        ),
      ).toBe('/api/qa/catalog');
    });

    it('controller uses UseGuards(ClarisaApiKeyGuard)', () => {
      expect(Reflect.getMetadata('__guards__', QaCatalogController)).toEqual([
        ClarisaApiKeyGuard,
      ]);
    });
  });
  describe('GET /results (QRF-R-1 / R-2 / R-4 / R-5)', () => {
    const getResults = (qs: string, headers: Record<string, string> = {}) =>
      request(app.getHttpServer())
        .get(`/results${qs}`)
        .set({ 'x-api-key': API_KEY, ...headers });

    it('valid key and year -> 200 with the service body unchanged, no envelope', async () => {
      const res = await getResults('?phase_year=2026');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        phase: 2026,
        page: 1,
        page_size: 100,
        total: 0,
        breakdown: { by_program: [], by_result_type: [] },
        items: [],
      });
      expect(res.body.response).toBeUndefined();
      expect(res.body.statusCode).toBeUndefined();
      expect(validate).toHaveBeenCalledWith(
        API_KEY,
        '/api/qa/results',
        expect.anything(),
      );
    });

    it('hands the parsed query to the service (CSV split, numbers, defaults)', async () => {
      await getResults(
        '?phase_year=2026&program_ids=5,7&result_type_keys=policy_change&page=2&page_size=50',
      );
      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({
          phase_year: 2026,
          program_ids: [5, 7],
          result_type_keys: ['policy_change'],
          page: 2,
          page_size: 50,
        }),
      );
    });

    it('scenario Year omitted: no phase_year -> 400, the service is never called (no clock or phase fallback)', async () => {
      const res = await getResults('');
      expect(res.status).toBe(400);
      expect(list).not.toHaveBeenCalled();
    });

    it.each([
      'phase_year=abc',
      'phase_year=2026&page=0',
      'phase_year=2026&page_size=201',
      'phase_year=2026&page_size=0',
      'phase_year=2026&program_ids=5,x',
    ])('%s -> 400 and the service is not called', async (qs) => {
      const res = await getResults(`?${qs}`);
      expect(res.status).toBe(400);
      expect(list).not.toHaveBeenCalled();
    });

    it("a year with no catalog -> the service's 404 reaches the client", async () => {
      list.mockRejectedValue(
        new NotFoundException('No QA catalog available for phase_year 2023'),
      );
      const res = await getResults('?phase_year=2023');
      expect(res.status).toBe(404);
    });

    it('scenario No key: user JWT without x-api-key -> 401, no data, CLARISA and service untouched', async () => {
      const res = await request(app.getHttpServer())
        .get('/results?phase_year=2026')
        .set('auth', 'eyJhbGciOiJIUzI1NiJ9.e30.sig')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig');
      expect(res.status).toBe(401);
      expect(res.body.items).toBeUndefined();
      expect(validate).not.toHaveBeenCalled();
      expect(list).not.toHaveBeenCalled();
    });

    it('key rejected by CLARISA -> 401 with no data', async () => {
      validate.mockResolvedValue(null);
      const res = await getResults('?phase_year=2026');
      expect(res.status).toBe(401);
      expect(res.body.items).toBeUndefined();
      expect(list).not.toHaveBeenCalled();
    });

    it("handler declares @BilateralClarisaEndpoint('/api/qa/results') (read from the real method, P-1)", () => {
      expect(
        Reflect.getMetadata(
          BILATERAL_CLARISA_ENDPOINT_KEY,
          QaCatalogController.prototype.getResults,
        ),
      ).toBe('/api/qa/results');
    });

    it('no ResponseInterceptor on the controller or the handler (body is the contract, not the envelope)', () => {
      expect(
        Reflect.getMetadata('__interceptors__', QaCatalogController),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata(
          '__interceptors__',
          QaCatalogController.prototype.getResults,
        ),
      ).toBeUndefined();
    });
  });

  describe('POST /results/details (QRF-R-1 / R-2 / R-7 / R-8)', () => {
    const post = (body: unknown, headers: Record<string, string> = {}) =>
      request(app.getHttpServer())
        .post('/results/details')
        .set({ 'x-api-key': API_KEY, ...headers })
        .send(body as object);
    const BODY = {
      phase_year: 2026,
      result_ids: [1, 2],
      field_keys: ['general.title'],
    };

    it('valid key and body -> 200 (not 201) with the service body unchanged, no envelope; the guard is asked for the details endpoint', async () => {
      const res = await post(BODY);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        phase: 2026,
        catalog_version: '2026.3',
        results: [],
        not_eligible: [],
      });
      expect(res.body.response).toBeUndefined();
      expect(validate).toHaveBeenCalledWith(
        API_KEY,
        '/api/qa/results/details',
        expect.anything(),
      );
      expect(details).toHaveBeenCalledWith(expect.objectContaining(BODY));
    });

    it('a body the DTO rejects -> 400 and the service is not called (e: 51 ids)', async () => {
      const ids = Array.from({ length: 51 }, (_, i) => i + 1);
      for (const body of [
        { phase_year: 2026, result_ids: ids },
        { result_ids: [1] },
        {},
      ]) {
        expect((await post(body)).status).toBe(400);
      }
      expect(details).not.toHaveBeenCalled();
    });

    it("the service's 400 / 404 reach the client", async () => {
      details.mockRejectedValueOnce(
        new NotFoundException('No QA catalog available for phase_year 2023'),
      );
      expect((await post({ ...BODY, phase_year: 2023 })).status).toBe(404);
    });

    it('scenario No key: user JWT without x-api-key -> 401, no data, CLARISA and service untouched', async () => {
      const res = await request(app.getHttpServer())
        .post('/results/details')
        .set('auth', 'eyJhbGciOiJIUzI1NiJ9.e30.sig')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig')
        .send(BODY);
      expect(res.status).toBe(401);
      expect(res.body.results).toBeUndefined();
      expect(validate).not.toHaveBeenCalled();
      expect(details).not.toHaveBeenCalled();
    });

    it('key rejected by CLARISA -> 401 with no data', async () => {
      validate.mockResolvedValue(null);
      const res = await post(BODY);
      expect(res.status).toBe(401);
      expect(details).not.toHaveBeenCalled();
    });

    it("handler declares @BilateralClarisaEndpoint('/api/qa/results/details') and carries no interceptor", () => {
      const handler = QaCatalogController.prototype.getResultsDetails;
      expect(Reflect.getMetadata(BILATERAL_CLARISA_ENDPOINT_KEY, handler)).toBe(
        '/api/qa/results/details',
      );
      expect(Reflect.getMetadata('__interceptors__', handler)).toBeUndefined();
    });
  });
});
