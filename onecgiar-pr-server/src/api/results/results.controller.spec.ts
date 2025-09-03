import { Test, TestingModule } from '@nestjs/testing';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

describe('ResultsController', () => {
  let controller: ResultsController;
  const mockService = {
    createOwnerResult: jest.fn().mockResolvedValue({ status: 201 }),
    findResultById: jest.fn().mockResolvedValue({ status: 200, response: { id: 1 } }),
    findAll: jest.fn().mockResolvedValue('OK'),
    findAllSimplified: jest.fn().mockResolvedValue({ status: 200, response: [] }),
    findForElasticSearch: jest.fn().mockResolvedValue({ status: 200, response: [] }),
    findAllByRole: jest.fn().mockResolvedValue({ status: 200, response: [] }),
    findAllResultsLegacyNew: jest.fn().mockResolvedValue({ status: 200, response: [] }),
    getAllInstitutions: jest.fn().mockResolvedValue({ status: 200, response: [] }),
    getAllInstitutionsType: jest.fn().mockResolvedValue({ status: 200, response: [] }),
    getChildlessInstitutionTypes: jest.fn().mockResolvedValue({ status: 200, response: [] }),
    mapResultLegacy: jest.fn().mockResolvedValue({ status: 200 }),
    createResultGeneralInformation: jest.fn().mockResolvedValue({ status: 200 }),
    getGeneralInformation: jest.fn().mockResolvedValue({ status: 200, response: {} }),
    deleteResult: jest.fn().mockResolvedValue({ status: 200 }),
    saveGeoScope: jest.fn().mockResolvedValue({ status: 200 }),
    getGeoScope: jest.fn().mockResolvedValue({ status: 200, response: {} }),
    transformResultCode: jest.fn().mockResolvedValue({ statusCode: 200, response: {} }),
    getResultDataForBasicReport: jest.fn().mockResolvedValue({ status: 200, response: [] }),
    versioningResultsById: jest.fn().mockResolvedValue(undefined),
    getCenters: jest.fn().mockResolvedValue({ statusCode: 200, response: [] }),
  } as unknown as jest.Mocked<ResultsService>;

  const user = { id: 1 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsController],
      providers: [{ provide: ResultsService, useValue: mockService }],
    }).compile();

    controller = module.get<ResultsController>(ResultsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create calls service with dto and user', async () => {
    const dto = { result_name: 'x' } as any;
    const res = await controller.create(dto, user);
    expect(mockService.createOwnerResult).toHaveBeenCalledWith(dto, user);
    expect(res).toEqual({ status: 201 });
  });

  it('findResultById delegates to service', async () => {
    const res = await controller.findResultById(2);
    expect(mockService.findResultById).toHaveBeenCalledWith(2);
    expect(res.status).toBe(200);
  });

  it('findAll concatenates result of service + name', async () => {
    const res = await controller.findAll('name');
    expect(mockService.findAll).toHaveBeenCalled();
    // Controller returns Promise + string without awaiting; coerces to string
    expect(res).toBe('[object Promise]' + 'name');
  });

  it('findAllResults delegates to service.findAll', async () => {
    const res = await controller.findAllResults();
    expect(mockService.findAll).toHaveBeenCalled();
    expect(res).toBe('OK');
  });

  it('findAllResultsForElasticSearch delegates to service.findAllSimplified', async () => {
    const res = await controller.findAllResultsForElasticSearch();
    expect(mockService.findAllSimplified).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('findAllResultsSimplified passes collection to service', async () => {
    const res = await controller.findAllResultsSimplified('collection');
    expect(mockService.findForElasticSearch).toHaveBeenCalledWith('collection');
    expect(res.status).toBe(200);
  });

  it('findInitiativesByUser returns echo string', () => {
    expect(controller.findInitiativesByUser(5)).toBe('aja 5');
  });

  it('findAllResultRoles passes userId and initiative', async () => {
    const res = await controller.findAllResultRoles(7, 'INIT');
    expect(mockService.findAllByRole).toHaveBeenCalledWith(7, 'INIT');
    expect(res.status).toBe(200);
  });

  it('depthSearch delegates to service', async () => {
    await controller.depthSearch('abc');
    expect(mockService.findAllResultsLegacyNew).toHaveBeenCalledWith('abc');
  });

  it('getInstitutions delegates to service', async () => {
    const res = await controller.getInstitutions();
    expect(mockService.getAllInstitutions).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('getNewInstitutionsType delegates with false', async () => {
    await controller.getNewInstitutionsType();
    expect(mockService.getAllInstitutionsType).toHaveBeenCalledWith(false);
  });

  it('getChildlessInstitutionsType delegates', async () => {
    await controller.getChildlessInstitutionsType();
    expect(mockService.getChildlessInstitutionTypes).toHaveBeenCalled();
  });

  it('getLegacyInstitutionsType delegates with true', async () => {
    await controller.getLegacyInstitutionsType();
    expect(mockService.getAllInstitutionsType).toHaveBeenCalledWith(true);
  });

  it('getAllInstitutionsType delegates without args', async () => {
    await controller.getAllInstitutionsType();
    expect(mockService.getAllInstitutionsType).toHaveBeenCalled();
  });

  it('mapResultLegacy passes dto and user', async () => {
    const dto = { legacy_id: 1 } as any;
    await controller.mapResultLegacy(dto, user);
    expect(mockService.mapResultLegacy).toHaveBeenCalledWith(dto, user);
  });

  it('createGeneralInformation delegates with dto and user', async () => {
    const dto = { result_id: 2 } as any;
    await controller.createGeneralInformation(dto, user);
    expect(mockService.createResultGeneralInformation).toHaveBeenCalledWith(dto, user);
  });

  it('getGeneralInformationByResult delegates', async () => {
    await controller.getGeneralInformationByResult(9);
    expect(mockService.getGeneralInformation).toHaveBeenCalledWith(9);
  });

  it('update calls deleteResult with id and user', async () => {
    await controller.update(10, user);
    expect(mockService.deleteResult).toHaveBeenCalledWith(10, user);
  });

  it('saveGeographic sets result_id and delegates', async () => {
    const dto = { countries: [] } as any;
    await controller.saveGeographic(dto, 11, user);
    expect(mockService.saveGeoScope).toHaveBeenCalledWith({ ...dto, result_id: 11 }, user);
  });

  it('getGeographic delegates', async () => {
    await controller.getGeographic(12);
    expect(mockService.getGeoScope).toHaveBeenCalledWith(12);
  });

  it('transformResultCode casts phase and delegates', async () => {
    await controller.transformResultCode(1001, '3');
    expect(mockService.transformResultCode).toHaveBeenCalledWith(1001, 3);
  });

  it('getResultDataForBasicReport delegates', async () => {
    const d1 = new Date('2020-01-01');
    const d2 = new Date('2020-12-31');
    await controller.getResultDataForBasicReport(d1, d2);
    expect(mockService.getResultDataForBasicReport).toHaveBeenCalledWith(d1, d2);
  });

  it('createVersion calls service and returns ok', async () => {
    const res = await controller.createVersion(13, user);
    expect(mockService.versioningResultsById).toHaveBeenCalledWith(13, user);
    expect(res).toBe('ok');
  });

  it('getCentersByResultId delegates', async () => {
    await controller.getCentersByResultId(14);
    expect(mockService.getCenters).toHaveBeenCalledWith(14);
  });
});
