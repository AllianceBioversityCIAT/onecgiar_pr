// @akili-spec quality-assurance/qa-field-catalog
import 'reflect-metadata';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BILATERAL_CLARISA_ENDPOINT_KEY } from '../bilateral/decorators/bilateral-clarisa-endpoint.decorator';
import { ClarisaApiKeyGuard } from '../bilateral/guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationService } from '../bilateral/services/clarisa-api-key-validation.service';
import { QaCatalogController } from './qa-catalog.controller';
import { QaCatalogService } from './qa-catalog.service';
import { FIXTURE_SOURCE } from './qa-catalog.fixtures';

const API_KEY = 'unit-test-key-value';

describe('QaCatalogController', () => {
  let app: INestApplication;
  const validate = jest.fn();

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
    validate.mockResolvedValue({ mis: { acronym: 'QA' } });
    const moduleRef = await Test.createTestingModule({
      controllers: [QaCatalogController],
      providers: [
        catalogProvider,
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
      expect(res.body.catalog_version).toBe('2026.7');
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
});
