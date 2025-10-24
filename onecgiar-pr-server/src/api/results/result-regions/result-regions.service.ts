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

      //!Importante hay una tabla por cada uno pero fijo se mandara a un solo endpoint y que el haga el resto.
      const result: Result = await this._resultRepository.getResultById(
        result_id,
      );
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const regions = createResultRegionDto.regions;
      const extra_regions = createResultRegionDto.extra_regions;
      if (
        (
          (!has_regions && geo_scope_id !== 2) ||
          (!has_extra_regions && extra_geo_scope_id !== 2)
        ) ||
        [3, 4].includes(geo_scope_id) ||
        (extra_geo_scope_id !== null && [3, 4].includes(extra_geo_scope_id))
      ) {
          const regionArgs: (number[] | null | undefined)[] = [];

          if (!has_regions) {
            regionArgs[0] = [];
          } else {
            regionArgs[0] = undefined;
          }

          if (!has_extra_regions) {
            regionArgs[1] = [];
          } else {
            regionArgs[1] = undefined;
          }

          await this._resultRegionRepository.updateRegionsV2(
            result.id,
            regionArgs[0],
            regionArgs[1],
          );

          result.has_regions = false;
          result.has_extra_regions = false;
      } else if (
          geo_scope_id === 2 || geo_scope_id === 1 || has_regions ||
          extra_geo_scope_id === 2 || extra_geo_scope_id === 1 || has_extra_regions
      ) {
          const regionIds =
            geo_scope_id === 1 || geo_scope_id === 2 || has_regions
              ? regions?.map((el) => el.id)
              : undefined;

          const extraRegionIds =
            extra_geo_scope_id === 1 || extra_geo_scope_id === 2 || has_extra_regions
              ? extra_regions?.map((el) => el.id)
              : undefined;

          await this._resultRegionRepository.updateRegionsV2(
            result.id,
            regionIds,
            extraRegionIds,
          );

          if (regions?.length || extra_regions?.length) {
            const resultRegionArray: ResultRegion[] = [];

              if (regions?.length) {
                const geo_scope_role_id = EnumGeoScopeRole.MAIN;
                for (const region of regions) {
                  const exist =
                    await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(
                      result.id,
                      region.id,
                      geo_scope_role_id,
                    );

                  if (!exist) {
                    const newRegion = new ResultRegion();
                    newRegion.region_id = region.id;
                    newRegion.result_id = result.id;
                    newRegion.geo_scope_role_id = geo_scope_role_id;
                    resultRegionArray.push(newRegion);
                  }
                }
              }

              if (extra_regions?.length) {
                const geo_scope_role_id = EnumGeoScopeRole.EXTRA;
                for (const region of extra_regions) {
                  const exist =
                    await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(
                      result.id,
                      region.id,
                      geo_scope_role_id,
                    );

                  if (!exist) {
                    const newRegion = new ResultRegion();
                    newRegion.region_id = region.id;
                    newRegion.result_id = result.id;
                    newRegion.geo_scope_role_id = geo_scope_role_id;
                    resultRegionArray.push(newRegion);
                  }
                }
              }
              
              if (resultRegionArray.length) {
                await this._resultRegionRepository.save(resultRegionArray);
              }
          }
        
        result.has_regions = geo_scope_id === 2 ? true : has_regions;
        result.has_extra_regions = extra_geo_scope_id === 2 ? true : has_extra_regions;  
      }

      result.geographic_scope_id = geo_scope_id;
      if (
        geo_scope_id == 4 ||
        geo_scope_id == 50
      ) {
        result.geographic_scope_id = 50;
      } else {
        result.geographic_scope_id = geo_scope_id;
      }

      if (extra_geo_scope_id !== null && (extra_geo_scope_id === 4 || extra_geo_scope_id === 50)) {
        result.extra_geo_scope_id = 50;
      } else {
        result.extra_geo_scope_id = extra_geo_scope_id;
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
}
