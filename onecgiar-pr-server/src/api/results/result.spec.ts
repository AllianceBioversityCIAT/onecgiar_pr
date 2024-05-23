import { Test, TestingModule } from '@nestjs/testing';
import { ResultsService } from './results.service';
import { ResultsModule } from './results.module';
import { OrmConfigTestModule } from '../../shared/test/orm-conection.module';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultLevelEnum } from '../../shared/constants/result-level.enum';
import { returnFormatService } from '../../shared/extendsGlobalDTO/returnServices.dto';
import { Result } from './entities/result.entity';
import { HttpStatus } from '@nestjs/common';
import { v4 } from 'uuid';
import { CreateGeneralInformationResultDto } from './dto/create-general-information-result.dto';
import { GeneralInformationDto } from './dto/general-information.dto';
import { ReturnResponseDto } from '../../shared/handlers/error.utils';
import { CreateResultGeoDto } from './dto/create-result-geo-scope.dto';

describe('Result service unit test', () => {
  let module: TestingModule;
  let resultService: ResultsService;
  let currentResultId: number;
  const userTest: TokenDto = {
    email: 'support@prms.pr',
    id: 1,
    first_name: 'support',
    last_name: 'prms',
  };
  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [],
      imports: [ResultsModule, OrmConfigTestModule],
    }).compile();

    resultService = module.get<ResultsService>(ResultsService);
  });

  it('should be defined', () => {
    expect(resultService).toBeDefined();
  });

  it('should return all results', async () => {
    const results = await resultService.findAll();
    expect(results.response).toBeDefined();
    if (results.response.length > 0) {
      expect(results.response[0].id).toBeDefined();
    }
  });

  it('showuld create a new result', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: `Result test:${v4()}`,
      handler: null,
    };
    const results: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(results.response).toBeDefined();
    const data: Result = results.response;
    currentResultId = data.id;
    expect(data.id).toBeDefined();
    expect(data.title).toBeDefined();
    expect(typeof data.title).toBe('string');
    expect(data.result_level_id).toBeDefined();
    expect(data.result_type_id).toBeDefined();
  }, 10000);

  it('should error when creating a new result with invalid title', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: null,
      handler: null,
    };
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.message).toBe(
      'missing data: Result name, Initiative or Result type',
    );
  });

  it('should error when creating a new result with result type not allowed', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: ResultTypeEnum.CAPACITY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: `Result test: fail type`,
      handler: null,
    };
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.message).toBe('Result type not allowed');
  });

  it('should error when creating a new result with invalid initiative', async () => {
    const newResult: CreateResultDto = {
      initiative_id: -1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: `Result test: fail initiative`,
      handler: null,
    };
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.message).toBe('Initiative Not Found');
  });

  it('should error when creating a new result with invalid result level', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: -1,
      result_name: `Result test: fail result level`,
      handler: null,
    };
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.message).toBe('Result Level not found');
  });

  it('should error when creating a new result with invalid result type', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: -1,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: `Result test: fail result type`,
      handler: null,
    };
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.message).toBe('Result Type not found');
  });

  it('should return all institutions', async () => {
    const results = await resultService.getAllInstitutions();
    expect(results.response).toBeDefined();
    if (results.response.length > 0) {
      expect(results.response[0].institutions_id).toBeDefined();
    }
  });

  it('should return all institutions type without children', async () => {
    const results = await resultService.getChildlessInstitutionTypes();
    expect(results.response).toBeDefined();
    if (results.response.length > 0) {
      expect(results.response[0].institutions_type_id).toBeDefined();
    }
  });

  it('should create a new result general information', async () => {
    const resultId = 2;
    const resultDescription: string = `Change description test 01: ${v4()}`;
    const resultTitle: string = `Policy Change Test: ${v4()}`;
    const newResult: CreateGeneralInformationResultDto = {
      result_id: resultId,
      initiative_id: 1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: resultTitle,
      result_description: resultDescription,
      gender_tag_id: 1,
      climate_change_tag_id: 1,
      nutrition_tag_level_id: 1,
      environmental_biodiversity_tag_level_id: 1,
      poverty_tag_level_id: 1,
      institutions: [],
      institutions_type: [],
      krs_url: `https://ciat.org/${v4()}`,
      is_krs: true,
      lead_contact_person: 'John Doe',
      is_discontinued: null,
      discontinued_options: [],
    };
    const results: returnFormatService =
      await resultService.createResultGeneralInformation(newResult, userTest);
    expect(results.response).toBeDefined();
    expect(results.response.updateResult.id).toBeDefined();
    expect(results.response.updateResult.title).toBe(resultTitle);
    expect(results.response.updateResult.description).toBe(resultDescription);
  }, 10000);

  it('should delete a result', async () => {
    const results: returnFormatService = await resultService.deleteResult(
      currentResultId,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.id).toBe(currentResultId);
    expect(results.message).toBe('The result has been successfully deleted');
    expect(results.status).toBe(HttpStatus.OK);
  });

  it('should error when deleting a result with invalid id', async () => {
    const results: returnFormatService = await resultService.deleteResult(
      -1,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.id).toBeUndefined();
    expect(results.message).toBe('The result does not exist');
    expect(results.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should error when deleting a result with quality assessment', async () => {
    const resultQA: number = 3;
    const results: returnFormatService = await resultService.deleteResult(
      resultQA,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.id).toBe(resultQA.toString());
    expect(results.message).toBe('Is already Quality Assessed');
    expect(results.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should delete a legacy result', async () => {
    const tempCurrentId: number = 4;
    const results: returnFormatService = await resultService.deleteResult(
      tempCurrentId,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.id).toBe(tempCurrentId.toString());
    expect(results.message).toBe('The result has been successfully deleted');
    expect(results.status).toBe(HttpStatus.OK);
  });

  it('should return all results', async () => {
    const results = await resultService.findAll();
    expect(results.response).toBeDefined();
    expect(results.response[0].id).toBeDefined();
  });

  it('should return a result by id', async () => {
    const resultId = 2;
    const results = await resultService.findResultById(resultId);
    expect(results.response).toBeDefined();
    const resData = <Result>results.response;
    expect(resData.id).toBe(resultId.toString());
  });

  it('should error when send an invalid id', async () => {
    const resultId = -1;
    const results = await resultService.findResultById(resultId);
    expect(results.message).toBe('Results Not Found');
    expect(results.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should return all results by role', async () => {
    const results = await resultService.findAllByRole(userTest.id);
    expect(results.response).toBeDefined();
    expect(results.response[0].id).toBeDefined();
  });

  it('should error when not found result', async () => {
    jest
      .spyOn(resultService['_customResultRepository'], 'AllResultsByRoleUsers')
      .mockResolvedValue(() => Promise.resolve([]));
    const results = resultService.findAllByRole(-1);
    expect((await results).message).toBe('Results Not Found');
    expect((await results).status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should return all results legacy new', async () => {
    const title = 'Assessment of the pote';
    const results = await resultService.findAllResultsLegacyNew(title);
    expect(results.response).toBeDefined();
    expect(results.response[0].id).toBeDefined();
    expect(results.message).toBe('Successful response');
    expect(results.status).toBe(HttpStatus.OK);
  });

  it('should error all when not found legacy result', async () => {
    const title = 'Error title Test: -1';
    const results = await resultService.findAllResultsLegacyNew(title);
    expect(results.message).toBe('Results Not Found');
    expect(results.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should return general information', async () => {
    const resultId = 2;
    const results = <ReturnResponseDto<GeneralInformationDto>>(
      await resultService.getGeneralInformation(resultId)
    );
    expect(results.response).toBeDefined();
    expect(results.response.result_id).toBe(resultId.toString());
    expect(results.response.climate_change_tag_id).toBeDefined();
    expect(results.response.is_krs).toBeDefined();
    expect(typeof results.response.krs_url).toBe('string');
    expect(typeof results.response.result_name).toBe('string');
    expect(typeof results.response.result_description).toBe('string');
    expect(results.message).toBe('Successful response');
    expect((results as returnFormatService).status).toBe(HttpStatus.OK);
  });

  it('should error when not found general information', async () => {
    const resultId = -1;
    const results = await resultService.getGeneralInformation(resultId);
    expect(results.message).toBe('Results Not Found');
    expect((results as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should save a new geo scope', async () => {
    const saveGeoScope: CreateResultGeoDto = {
      countries: [{ id: 4 }, { id: 8 }],
      has_countries: true,
      regions: [{ id: 5 }, { id: 2 }],
      has_regions: true,
      result_id: 2,
      geo_scope_id: 2,
    };
    const results: returnFormatService = await resultService.saveGeoScope(
      saveGeoScope,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.result_id).toBe(saveGeoScope.result_id);
    expect(results.response.geo_scope_id).toBe(saveGeoScope.geo_scope_id);
    expect(results.message).toBe('Successful response');
    expect(results.status).toBe(HttpStatus.OK);
  });

  it('should get a geo scope', async () => {
    const resultId = 2;
    const results: returnFormatService =
      await resultService.getGeoScope(resultId);
    expect(results.response).toBeDefined();
    expect(results.response.regions).toBeDefined();
    if (results.response.regions.length > 0) {
      expect(results.response.regions[0].result_region_id).toBeDefined();
    }
    expect(results.message).toBe('Successful response');
    expect(results.status).toBe(HttpStatus.OK);
  });
});
