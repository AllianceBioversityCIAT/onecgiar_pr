import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultRegionDto } from './dto/create-result-region.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from './result-regions.repository';
import { ClarisaGeographicScopeRepository } from '../../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultRepository } from '../result.repository';
import { Result } from '../entities/result.entity';
import { ResultRegion } from './entities/result-region.entity';
import { VersionsService } from '../versions/versions.service';
import { EnumGeoScopeRole } from '../../results-framework-reporting/geo_scope_role/enum/geo_scope_role.enum';

@Injectable()
export class ResultRegionsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _clarisaGeographicScopeRepository: ClarisaGeographicScopeRepository,
  ) {}

  async create(createResultRegionDto: CreateResultRegionDto) {
    try {
      if (!createResultRegionDto?.geo_scope_id) {
        throw {
          response: {},
          message: 'Missing data in the request',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      //!importante hay una tabla por cada uno pero fijo se mandara a un solo enpoint y que el haga el restos
      const result: Result = await this._resultRepository.getResultById(
        createResultRegionDto.result_id,
      );
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const regions = createResultRegionDto.regions;
      if (
        (!createResultRegionDto.has_regions &&
          createResultRegionDto.geo_scope_id != 2) ||
        createResultRegionDto.geo_scope_id == 4 ||
        createResultRegionDto.geo_scope_id == 3
      ) {
        await this._resultRegionRepository.updateRegions(result.id, []);
        result.has_regions = false;
      } else if (
        createResultRegionDto.geo_scope_id == 2 ||
        createResultRegionDto.geo_scope_id == 1 ||
        createResultRegionDto.has_regions
      ) {
        if (regions) {
          await this._resultRegionRepository.updateRegions(
            result.id,
            createResultRegionDto.regions.map((el) => el.id),
          );
          if (regions?.length) {
            const resultRegionArray: ResultRegion[] = [];
            for (let index = 0; index < regions.length; index++) {
              const exist =
                await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(
                  result.id,
                  regions[index].id,
                );
              if (!exist) {
                const newRegions = new ResultRegion();
                newRegions.region_id = regions[index].id;
                newRegions.result_id = result.id;
                resultRegionArray.push(newRegions);
              }
              await this._resultRegionRepository.save(resultRegionArray);
            }
          }
        }
        if (createResultRegionDto.geo_scope_id == 2) {
          result.has_regions = true;
        } else {
          result.has_regions = createResultRegionDto.has_regions;
        }
      }

      if (
        createResultRegionDto.geo_scope_id == 4 ||
        createResultRegionDto.geo_scope_id == 50
      ) {
        result.geographic_scope_id = 50;
      } else {
        result.geographic_scope_id = createResultRegionDto.geo_scope_id;
      }
      await this._resultRepository.save(result);

      return {
        response: regions,
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async createV2(createResultRegionDto: CreateResultRegionDto) {
    try {
      const {
        geo_scope_id,
        extra_geo_scope_id,
        result_id,
        has_regions,
        has_extra_regions,
      } = createResultRegionDto;

      if (!geo_scope_id) {
        throw {
          response: {},
          message: 'Missing data in the request',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const result: Result =
        await this._resultRepository.getResultById(result_id);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      // 🔹 Manejar REGIONS
      await this.handleRegions({
        regions: createResultRegionDto.regions,
        result,
        hasRegions: has_regions,
        geoScopeId: geo_scope_id,
        role: EnumGeoScopeRole.MAIN,
      });

      // 🔹 Manejar EXTRA REGIONS
      await this.handleRegions({
        regions: createResultRegionDto.extra_regions,
        result,
        hasRegions: has_extra_regions,
        geoScopeId: extra_geo_scope_id,
        role: EnumGeoScopeRole.EXTRA,
      });

      // 🔹 Actualizar scopes en Result
      result.geographic_scope_id = [4, 50].includes(geo_scope_id)
        ? 50
        : geo_scope_id;

      result.extra_geo_scope_id =
        extra_geo_scope_id !== null && [4, 50].includes(extra_geo_scope_id)
          ? 50
          : extra_geo_scope_id;

      await this._resultRepository.save(result);

      return {
        response: createResultRegionDto,
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async handleRegions({
    regions,
    result,
    hasRegions,
    geoScopeId,
    role,
  }): Promise<Result> {
    if (
      (!hasRegions && geoScopeId != 2) ||
      geoScopeId == 4 ||
      geoScopeId == 3
    ) {
      await this._resultRegionRepository.updateRegionsV2(result.id, [], role);
      if (role === EnumGeoScopeRole.EXTRA) {
        result.has_extra_regions = false;
      } else {
        result.has_regions = false;
      }

      return result;
    } else if (geoScopeId == 2 || geoScopeId == 1 || hasRegions) {
      if (regions) {
        await this._resultRegionRepository.updateRegionsV2(
          result.id,
          regions.map((el) => el.id),
          role,
        );
        if (regions?.length) {
          console.log('regions.length', regions);
          const resultRegionArray: ResultRegion[] = [];
          for (let index = 0; index < regions.length; index++) {
            const exist =
              await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(
                result.id,
                regions[index].id,
                role,
              );
            if (!exist) {
              const newRegions = new ResultRegion();
              newRegions.region_id = regions[index].id;
              newRegions.result_id = result.id;
              newRegions.geo_scope_role_id = role;
              resultRegionArray.push(newRegions);
            }
          }

          if (resultRegionArray.length) {
            console.log('resultRegionArray.length', resultRegionArray);
            await this._resultRegionRepository.save(resultRegionArray);
          }
        }
      }
      if (role === EnumGeoScopeRole.EXTRA) {
        result.has_extra_regions = true;
      } else {
        result.has_regions = true;
      }
    }
    return result;
  }
}
