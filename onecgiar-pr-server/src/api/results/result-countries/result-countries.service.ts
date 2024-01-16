import { Injectable, HttpStatus } from '@nestjs/common';
import { ResultRepository } from '../result.repository';
import { CreateResultCountryDto } from './dto/create-result-country.dto';
import { Result } from '../entities/result.entity';
import { ResultCountryRepository } from './result-countries.repository';
import { ResultCountry } from './entities/result-country.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { VersionsService } from '../versions/versions.service';

@Injectable()
export class ResultCountriesService {
  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _versionsService: VersionsService,
    private readonly _handlersError: HandlersError,
  ) {}

  async create(createResultCountryDto: CreateResultCountryDto) {
    try {
      if (!createResultCountryDto?.scope_id) {
        throw {
          response: {},
          message: 'Missing data in the request',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      //!importante hay una tabla por cada uno pero fijo se mandara a un solo enpoint y que el haga el restos
      const result: Result = await this._resultRepository.getResultById(
        createResultCountryDto.result_id,
      );
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const countries = createResultCountryDto.countries;
      if (
        (!createResultCountryDto.has_countries &&
          createResultCountryDto.scope_id != 3) ||
        createResultCountryDto.scope_id == 4
      ) {
        await this._resultCountryRepository.updateCountries(result.id, []);
        result.has_countries = false;
      } else if (
        createResultCountryDto.scope_id == 3 ||
        createResultCountryDto.has_countries
      ) {
        if (countries) {
          await this._resultCountryRepository.updateCountries(
            result.id,
            createResultCountryDto.countries.map((e) => e.id),
          );
          if (countries?.length) {
            const resultRegionArray: ResultCountry[] = [];
            for (let index = 0; index < countries?.length; index++) {
              const exist =
                await this._resultCountryRepository.getResultCountrieByIdResultAndCountryId(
                  result.id,
                  countries[index].id,
                );
              if (!exist) {
                const newRegions = new ResultCountry();
                newRegions.country_id = countries[index].id;
                newRegions.result_id = result.id;
                resultRegionArray.push(newRegions);
              }

              await this._resultCountryRepository.save(resultRegionArray);
            }
          }
        }
        if (createResultCountryDto.scope_id == 3) {
          result.has_countries = true;
        } else {
          result.has_countries = createResultCountryDto.has_countries;
        }
      }

      if (countries && createResultCountryDto.scope_id == 3) {
        result.geographic_scope_id =
          createResultCountryDto.countries?.length > 1 ? 3 : 4;
      } else if (
        createResultCountryDto.scope_id == 4 ||
        createResultCountryDto.scope_id == 50
      ) {
        result.geographic_scope_id = 50;
      } else {
        result.geographic_scope_id = createResultCountryDto.scope_id;
      }
      await this._resultRepository.save(result);

      return {
        response: countries,
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
