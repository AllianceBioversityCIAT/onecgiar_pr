import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { IpsrRepository } from './ipsr.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ExcelReportDto } from './dto/excel-report-ipsr.dto';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';
import { AdUserRepository } from '../ad_users';
import { InitiativeEntityMapRepository } from '../initiative_entity_map/initiative_entity_map.repository';
import { In } from 'typeorm';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

@Injectable()
export class IpsrService {
  constructor(
    protected readonly _handlersError: HandlersError,
    private readonly _returnResponse: ReturnResponse,
    protected readonly _ipsrRespository: IpsrRepository,
    private readonly _resultsInvestmentDiscontinuedOptionRepository: ResultsInvestmentDiscontinuedOptionRepository,
    private readonly _adUserRepository?: AdUserRepository,
    private readonly _initiativeEntityMapRepository?: InitiativeEntityMapRepository,
    private readonly _roleByUserRepository?: RoleByUserRepository,
  ) {}

  async findAllInnovations(initiativeId: number[]) {
    try {
      const innovation =
        await this._ipsrRespository.getResultsInnovation(initiativeId);
      return this._returnResponse.format({
        response: innovation,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async findInnovationDetail(resultId: number) {
    try {
      const result =
        await this._ipsrRespository.getResultInnovationDetail(resultId);
      if (!result) {
        throw new Error('The result was not found.');
      }

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findOneInnovation(resultId: number) {
    try {
      const resultArr =
        await this._ipsrRespository.getResultInnovationById(resultId);
      const result = resultArr[0];
      if (!result) {
        throw new Error('The result was not found.');
      }

      const discontinued_options =
        await this._resultsInvestmentDiscontinuedOptionRepository.find({
          where: {
            result_id: resultId,
            is_active: true,
          },
        });

      let leadContactPersonData = null;
      if (result.lead_contact_person_id) {
        try {
          leadContactPersonData = await this._adUserRepository.findOne({
            where: { id: result.lead_contact_person_id, is_active: true },
          });
        } catch (error) {
          console.warn('Failed to get lead contact person data:', error);
        }
      }
      result.lead_contact_person_data = leadContactPersonData;
      result.discontinued_options = discontinued_options;

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async allInnovationPackages(user: TokenDto) {
    try {
      let result = await this._ipsrRespository.getAllInnovationPackages();

      const entity_init_map = await this._initiativeEntityMapRepository.find({
        where: { initiativeId: In(result.map((item) => item.initiative_id)) },
        relations: ['entity_obj'],
      });

      const userInitiatives = await this._roleByUserRepository.find({
        where: { user: user.id, active: true },
        relations: ['obj_initiative'],
      });

      const initiativesPortfolio3 = userInitiatives.filter(
        (rbu) => rbu.obj_initiative?.portfolio_id === 3,
      );

      result = result.map((item) => {
        const entityMaps = entity_init_map.filter(
          (map) => map.initiativeId === item.initiative_id,
        );
        return {
          ...item,
          initiative_entity_map: entityMaps.length
            ? entityMaps.map((entityMap) => ({
                id: entityMap.id,
                entityId: entityMap.entityId,
                initiativeId: entityMap.initiativeId,
                entityName: entityMap.entity_obj?.name ?? null,
              }))
            : [],
          initiative_entity_user: initiativesPortfolio3,
        };
      });

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async allInnovationPackagesFiltered(user: TokenDto, query: Record<string, any> = {}) {
    try {
      const pageNum = Number(query.page);
      const limitNum = Number(query.limit);
      const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : undefined;
      const limit = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : undefined;
      const offset = page && limit ? (page - 1) * limit : undefined;

      const toNumberArray = (val: any): number[] | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        const asArray = Array.isArray(val) ? val : String(val).split(',');
        const nums = asArray
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));
        return nums.length ? nums : undefined;
      };

      const initiativeCode: string | undefined =
        query.initiative ?? query.initiativeCode ?? undefined;

      const filters = {
        initiativeCode,
        versionId:
          toNumberArray(query.phase ?? query.version_id ?? query.versionId),
        submitterId: toNumberArray(query.submitter ?? query.submitter_id),
        resultTypeId:
          toNumberArray(query.result_type ?? query.result_type_id ?? query.type),
        portfolioId:
          toNumberArray(query.portfolio ?? query.portfolio_id ?? query.portfolioId),
        statusId: toNumberArray(query.status_id ?? query.status),
      };

      const repoRes = await this._ipsrRespository.getAllInnovationPackagesFiltered(
        filters,
        limit !== undefined ? { limit, offset: offset ?? 0 } : undefined,
      );

      let result: any[] = repoRes.results ?? [];
      const total = repoRes.total ?? result.length;

      const entity_init_map = await this._initiativeEntityMapRepository.find({
        where: { initiativeId: In(result.map((item) => item.initiative_id)) },
        relations: ['entity_obj'],
      });

      const userInitiatives = await this._roleByUserRepository.find({
        where: { user: user.id, active: true },
        relations: ['obj_initiative'],
      });

      const initiativesPortfolio3 = userInitiatives.filter(
        (rbu) => rbu.obj_initiative?.portfolio_id === 3,
      );

      result = result.map((item) => {
        const entityMaps = entity_init_map.filter(
          (map) => map.initiativeId === item.initiative_id,
        );
        return {
          ...item,
          initiative_entity_map: entityMaps.length
            ? entityMaps.map((entityMap) => ({
                id: entityMap.id,
                entityId: entityMap.entityId,
                initiativeId: entityMap.initiativeId,
                entityName: entityMap.entity_obj?.name ?? null,
              }))
            : [],
          initiative_entity_user: initiativesPortfolio3,
        };
      });

      if (!result.length) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: limit !== undefined
          ? {
              items: result,
              meta: {
                total,
                page: page ?? 1,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
              },
            }
          : result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getIpsrList(excelReportDto: ExcelReportDto) {
    try {
      const ipsrList = await this._ipsrRespository.getIpsrList(excelReportDto);

      if (!ipsrList[0]) {
        throw new Error(
          'No results were found with the filters applied, the report is not generated.',
        );
      }

      return {
        response: ipsrList,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
