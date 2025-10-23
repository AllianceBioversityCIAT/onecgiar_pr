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
      await this._resultService.saveGeoScope(createResultGeo, user);

      await this._resultRegionsService.createV2(createResultGeo);
      await this._resultCountriesService.createV2(createResultGeo, user);

      await this._resultRepository.update(createResultGeo.result_id, {
        geographic_scope_id: createResultGeo.geo_scope_id,
        has_regions: createResultGeo.has_regions,
        has_countries: createResultGeo.has_countries,
        extra_geo_scope_id: createResultGeo.extra_geo_scope_id ?? null,
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

  async getGeoScope(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);

      if (!result?.id) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const regions: (ResultRegion | string)[] =
        await this._resultRegionRepository.getResultRegionByResultId(resultId);
      const countries: (ResultCountry | string)[] =
        await this._resultCountryRepository.getResultCountriesByResultId(
          resultId,
        );

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
      return {
        response: {
          regions: regions,
          countries,
          geo_scope_id: scope,
          has_countries: result?.has_countries,
          has_regions: result?.has_regions,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
