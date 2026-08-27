import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ResultsKnowledgeProductsController } from './results-knowledge-products.controller';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { CgspaceDiscoveryService } from './cgspace-discovery/cgspace-discovery.service';
import { CgspaceSearchQueryDto } from './cgspace-discovery/dto/cgspace-search-query.dto';
import { CgspaceFacetQueryDto } from './cgspace-discovery/dto/cgspace-facet-query.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsKnowledgeProductDto } from './dto/results-knowledge-product.dto';
import { ResultsKnowledgeProductSaveDto } from './dto/results-knowledge-product-save.dto';
import { FilterDto } from './dto/filter.dto';

describe('ResultsKnowledgeProductsController', () => {
  let controller: ResultsKnowledgeProductsController;

  const mockResultsKnowledgeProductsService = {
    create: jest.fn().mockResolvedValue({ status: 201, response: { id: 1 } }),
    findOnCGSpace: jest
      .fn()
      .mockResolvedValue({ status: 200, response: { title: 'Test' } }),
    findResultKnowledgeProductByHandle: jest
      .fn()
      .mockResolvedValue({ status: 200, response: {} }),
    findOneByKnowledgeProductId: jest
      .fn()
      .mockResolvedValue({ status: 200, response: {} }),
    findOneByResultId: jest
      .fn()
      .mockResolvedValue({ status: 200, response: {} }),
    syncAgain: jest.fn().mockResolvedValue({ status: 200, response: {} }),
    upsert: jest.fn().mockResolvedValue({ status: 200, response: {} }),
    getMQAPMatchesList: jest
      .fn()
      .mockResolvedValue({ status: 200, response: [] }),
  } as unknown as jest.Mocked<ResultsKnowledgeProductsService>;

  const mockCgspaceDiscoveryService = {
    search: jest.fn().mockResolvedValue({
      response: {
        items: [
          {
            uuid: '11111111-2222-3333-4444-555555555555',
            handle: '10568/128401',
            handleUrl: 'https://hdl.handle.net/10568/128401',
            itemUrl:
              'https://cgspace.cgiar.org/items/11111111-2222-3333-4444-555555555555',
            title: 'Maize breeding in Africa',
            type: 'Journal Article',
            year: 2026,
            authors: ['Smith, J.'],
            affiliations: ['IITA'],
            countries: ['Kenya'],
            doi: 'https://doi.org/10.1000/182',
            uri: 'https://hdl.handle.net/10568/128401',
          },
        ],
        page: {
          number: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
        },
      },
      message: 'CGSpace search results',
      status: 200,
    }),
    facets: jest.fn().mockResolvedValue({
      response: {
        name: 'itemtype',
        values: [
          { label: 'Journal Article', value: 'Journal Article', count: 42 },
        ],
      },
      message: 'CGSpace facet results',
      status: 200,
    }),
  } as unknown as jest.Mocked<CgspaceDiscoveryService>;

  const mockUser: TokenDto = {
    id: 1,
    email: 'test@cgiar.org',
    first_name: 'Test',
    last_name: 'User',
  } as TokenDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsKnowledgeProductsController],
      providers: [
        {
          provide: ResultsKnowledgeProductsService,
          useValue: mockResultsKnowledgeProductsService,
        },
        {
          provide: CgspaceDiscoveryService,
          useValue: mockCgspaceDiscoveryService,
        },
      ],
    }).compile();

    controller = module.get<ResultsKnowledgeProductsController>(
      ResultsKnowledgeProductsController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('CGSpace Discovery Endpoints', () => {
    describe('cgspaceSearch', () => {
      it('should delegate search to CgspaceDiscoveryService.search and return service response wrapper', async () => {
        const queryDto: CgspaceSearchQueryDto = {
          query: 'maize',
          page: 0,
          size: 10,
          year: '2026',
        };

        const result = await controller.cgspaceSearch(queryDto);

        expect(mockCgspaceDiscoveryService.search).toHaveBeenCalledWith(
          queryDto,
        );
        expect(result.status).toBe(200);
        expect(result.message).toBe('CGSpace search results');
        expect(result.response.items).toHaveLength(1);
        expect(result.response.items[0].handle).toBe('10568/128401');
      });
    });

    describe('cgspaceFacets', () => {
      it('should delegate facets to CgspaceDiscoveryService.facets and return service response wrapper', async () => {
        const facetQueryDto: CgspaceFacetQueryDto = {
          size: 25,
          prefix: 'Jour',
        };

        const result = await controller.cgspaceFacets(
          'itemtype',
          facetQueryDto,
        );

        expect(mockCgspaceDiscoveryService.facets).toHaveBeenCalledWith(
          'itemtype',
          facetQueryDto,
        );
        expect(result.status).toBe(200);
        expect(result.message).toBe('CGSpace facet results');
        expect(result.response.name).toBe('itemtype');
        expect(result.response.values).toHaveLength(1);
      });
    });

    describe('HTTP routes with the per-route ValidationPipe (supertest)', () => {
      // These tests boot a real Nest application around the controller and hit
      // the routes over HTTP, so they only pass if the @Query() parameter of
      // each route actually carries the ValidationPipe (whitelist +
      // forbidNonWhitelisted + transform). Removing the pipe from the
      // controller makes the 400 cases fail.
      let app: INestApplication;

      beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
          controllers: [ResultsKnowledgeProductsController],
          providers: [
            {
              provide: ResultsKnowledgeProductsService,
              useValue: mockResultsKnowledgeProductsService,
            },
            {
              provide: CgspaceDiscoveryService,
              useValue: mockCgspaceDiscoveryService,
            },
          ],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
      });

      afterAll(async () => {
        await app.close();
      });

      it('GET /cgspace/search?query=maize returns 200 with response.items', async () => {
        const res = await request(app.getHttpServer())
          .get('/cgspace/search')
          .query({ query: 'maize' })
          .expect(200);

        expect(res.body.response.items).toHaveLength(1);
        expect(res.body.response.items[0].handle).toBe('10568/128401');
        expect(mockCgspaceDiscoveryService.search).toHaveBeenCalledTimes(1);
        const dto = mockCgspaceDiscoveryService.search.mock
          .calls[0][0] as CgspaceSearchQueryDto;
        expect(dto).toBeInstanceOf(CgspaceSearchQueryDto);
        expect(dto.query).toBe('maize');
        expect(dto.page).toBe(0);
        expect(dto.size).toBe(10);
        expect(dto.repository).toBe('cgspace');
      });

      it('GET /cgspace/search?query=maize&size=100 returns 400 (size > 25)', async () => {
        const res = await request(app.getHttpServer())
          .get('/cgspace/search')
          .query({ query: 'maize', size: 100 })
          .expect(400);

        expect(res.body.statusCode).toBe(400);
        expect(mockCgspaceDiscoveryService.search).not.toHaveBeenCalled();
      });

      it('GET /cgspace/search with a non-whitelisted param returns 400', async () => {
        await request(app.getHttpServer())
          .get('/cgspace/search')
          .query({ query: 'maize', maliciousParam: 'inject' })
          .expect(400);

        expect(mockCgspaceDiscoveryService.search).not.toHaveBeenCalled();
      });

      it('GET /cgspace/search?query=ab (too short, no filters) returns 400', async () => {
        await request(app.getHttpServer())
          .get('/cgspace/search')
          .query({ query: 'ab' })
          .expect(400);

        expect(mockCgspaceDiscoveryService.search).not.toHaveBeenCalled();
      });

      it('GET /cgspace/facets/itemtype returns 200 with defaults applied', async () => {
        const res = await request(app.getHttpServer())
          .get('/cgspace/facets/itemtype')
          .expect(200);

        expect(res.body.response.name).toBe('itemtype');
        expect(res.body.response.values).toHaveLength(1);
        expect(mockCgspaceDiscoveryService.facets).toHaveBeenCalledTimes(1);
        const [name, dto] = mockCgspaceDiscoveryService.facets.mock.calls[0];
        expect(name).toBe('itemtype');
        expect(dto).toBeInstanceOf(CgspaceFacetQueryDto);
        expect((dto as CgspaceFacetQueryDto).size).toBe(50);
      });

      it('GET /cgspace/facets/itemtype?size=101 returns 400 (size > 100)', async () => {
        await request(app.getHttpServer())
          .get('/cgspace/facets/itemtype')
          .query({ size: 101 })
          .expect(400);

        expect(mockCgspaceDiscoveryService.facets).not.toHaveBeenCalled();
      });

      it('GET /cgspace/facets/itemtype with a non-whitelisted param returns 400', async () => {
        await request(app.getHttpServer())
          .get('/cgspace/facets/itemtype')
          .query({ size: 50, unexpected: 'param' })
          .expect(400);

        expect(mockCgspaceDiscoveryService.facets).not.toHaveBeenCalled();
      });
    });
  });

  describe('Standard Knowledge Product Endpoints', () => {
    it('create should delegate to service.create', async () => {
      const dto = {} as ResultsKnowledgeProductDto;
      await controller.create(dto, mockUser);
      expect(mockResultsKnowledgeProductsService.create).toHaveBeenCalledWith(
        dto,
        mockUser,
      );
    });

    it('getFromMQAPByHandle should delegate to service.findOnCGSpace', async () => {
      await controller.getFromMQAPByHandle('10568/128401', mockUser);
      expect(
        mockResultsKnowledgeProductsService.findOnCGSpace,
      ).toHaveBeenCalledWith('10568/128401', mockUser, null);
    });

    it('findResultKnowledgeProductByHandle should delegate to service.findResultKnowledgeProductByHandle', async () => {
      await controller.findResultKnowledgeProductByHandle('10568/128401');
      expect(
        mockResultsKnowledgeProductsService.findResultKnowledgeProductByHandle,
      ).toHaveBeenCalledWith('10568/128401');
    });

    it('getKnowledgeProductById should delegate to service.findOneByKnowledgeProductId', async () => {
      await controller.getKnowledgeProductById(42);
      expect(
        mockResultsKnowledgeProductsService.findOneByKnowledgeProductId,
      ).toHaveBeenCalledWith(42);
    });

    it('getKnowledgeProductByResultId should delegate to service.findOneByResultId', async () => {
      await controller.getKnowledgeProductByResultId(100);
      expect(
        mockResultsKnowledgeProductsService.findOneByResultId,
      ).toHaveBeenCalledWith(100);
    });

    it('update should delegate to service.syncAgain', async () => {
      await controller.update(100, mockUser);
      expect(
        mockResultsKnowledgeProductsService.syncAgain,
      ).toHaveBeenCalledWith(100, mockUser);
    });

    it('remove should delegate to service.upsert', async () => {
      const dto = {} as ResultsKnowledgeProductSaveDto;
      await controller.remove(100, mockUser, dto);
      expect(mockResultsKnowledgeProductsService.upsert).toHaveBeenCalledWith(
        100,
        mockUser,
        dto,
      );
    });

    it('getMQAPMatchesList should delegate to service.getMQAPMatchesList', async () => {
      const dto = {} as FilterDto;
      await controller.getMQAPMatchesList(dto);
      expect(
        mockResultsKnowledgeProductsService.getMQAPMatchesList,
      ).toHaveBeenCalledWith(dto);
    });
  });
});
