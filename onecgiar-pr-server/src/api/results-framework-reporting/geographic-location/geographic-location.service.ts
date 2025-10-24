import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateGeographicLocationDto } from './dto/create-geographic-location.dto';
import { UpdateGeographicLocationDto } from './dto/update-geographic-location.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionsService } from '../../results/result-regions/result-regions.service';
import { ResultCountriesService } from '../../results/result-countries/result-countries.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateResultGeoDto } from '../../results/dto/create-result-geo-scope.dto';
import { ResultsService } from '../../results/results.service';
import { ResultRepository } from '../../results/result.repository';
import { ElasticOperationDto } from '../../../elastic/dto/elastic-operation.dto';
import { ElasticService } from '../../../elastic/elastic.service';
import { ResultRegion } from '../../results/result-regions/entities/result-region.entity';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { ResultCountry } from '../../results/result-countries/entities/result-country.entity';
import { EnumGeoScopeRole } from '../geo_scope_role/enum/geo_scope_role.enum';

@Injectable()
export class GeographicLocationService {

  private readonly _logger: Logger = new Logger(GeographicLocationService.name);
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRegionsService: ResultRegionsService,
    private readonly _resultCountriesService: ResultCountriesService,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultService: ResultsService,
    private readonly _elasticService: ElasticService,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,


  ) {}

  async saveGeoScopeV2(createResultGeo: CreateGeographicLocationDto, user: TokenDto) {
    try {
      //await this._resultService.saveGeoScope(createResultGeo, user); // COMPROBAR SI ESTO ES NECESARIO PORQUE EN EL RESTO DEL CÓDIGO YA ABARCO LAS FUNCIONALIDADES DE AMBAS VERSIONES UNIFICADAS.

      await this._resultRegionsService.createV2(createResultGeo);
      await this._resultCountriesService.createV2(createResultGeo, user);

      await this._resultRepository.update(createResultGeo.result_id, {
        geographic_scope_id: createResultGeo.geo_scope_id,
        extra_geo_scope_id: createResultGeo.extra_geo_scope_id ?? null,
        has_regions: createResultGeo.has_regions,
        has_extra_regions: createResultGeo.has_extra_regions,
        has_countries: createResultGeo.has_countries,
        has_extra_countries: createResultGeo.has_extra_countries,
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

      const toUpdateFromElastic = await this._resultService.findAllSimplified(
        createResultGeo.result_id.toString(),
      );

      if (toUpdateFromElastic.status !== HttpStatus.OK) {
        this._logger.warn(
          `The result #${createResultGeo.result_id} could not be found to be updated in Elasticsearch.`,
        );
      } else {
        try {
          const elasticOperations = [
            new ElasticOperationDto('PATCH', toUpdateFromElastic.response[0]),
          ];

          const elasticJson =
            this._elasticService.getBulkElasticOperationResults(
              process.env.ELASTIC_DOCUMENT_NAME,
              elasticOperations,
            );

          await this._elasticService.sendBulkOperationToElastic(elasticJson);
        } catch (_error) {
          this._logger.warn(
            `The Elasticsearch update of the geoscope failed for result #${createResultGeo.result_id}.`,
          );
        }
      }

      return {
        response: createResultGeo,
        message: 'Successful response (v2)',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getGeoScopeV2(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      console.log('result', result.id);

      if (!result?.id) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let regions: ResultRegion[] = [];
      let extra_regions: ResultRegion[] = [];
      let countries: ResultCountry[] = [];
      let extra_countries: ResultCountry[] = [];

      const allRegions: (ResultRegion | string)[] =
        await this._resultRegionRepository.getResultRegionByResultId(resultId);
      
      if (Array.isArray(allRegions)) {
        const validRegions = allRegions.filter(
          (r): r is ResultRegion => typeof r !== 'string' && !!r.geo_scope_role_id
        );

        regions = validRegions.filter(r => r.geo_scope_role_id === 1);
        extra_regions = validRegions.filter(r => r.geo_scope_role_id === 2);
      }

      const allCountries: (ResultCountry | string)[] =
        await this._resultCountryRepository.getResultCountriesByResultId(
          resultId,
        );
      
      if (Array.isArray(allCountries)) {
        const validCountries = allCountries.filter(
          (r): r is ResultCountry => typeof r !== 'string' && !!r.geo_scope_role_id
        );

        countries = validCountries.filter(r => r.geo_scope_role_id === 1);
        extra_countries = validCountries.filter(r => r.geo_scope_role_id === 2);
      }

      let scope = 0;
      if (
        result.geographic_scope_id == 1 ||
        result.geographic_scope_id == 2 ||
        result.geographic_scope_id == 5
      ) {
        scope = result.geographic_scope_id;
      } else if (
        result.geographic_scope_id == 3 ||
        result.geographic_scope_id == 4
      ) {
        scope = 3;
      } else if (result.geographic_scope_id == 50) {
        scope = 50;
      }

      let extra_scope = null;
      if (
        result.geo_extra_scope_id == 1 ||
        result.geo_extra_scope_id == 2 ||
        result.geo_extra_scope_id == 5
      ) {
        extra_scope = result.geo_extra_scope_id;
      } else if (
        result.geo_extra_scope_id == 3 ||
        result.geo_extra_scope_id == 4
      ) {
        extra_scope = 3;
      } else if (result.geo_extra_scope_id == 50) {
        extra_scope = 50;
      }
      return {
        response: {
          regions,
          countries,
          geo_scope_id: scope,
          has_countries: result?.has_countries,
          has_regions: result?.has_regions,
          extra_geo_scope_id: extra_scope,
          extra_regions,
          extra_countries,
          has_extra_regions: result?.has_extra_regions,
          has_extra_countries: result?.has_extra_countries,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
