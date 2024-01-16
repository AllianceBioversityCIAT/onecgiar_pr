import { Injectable, HttpStatus } from '@nestjs/common';
import { ResultRepository } from '../result.repository';
import { CreateResultCountryDto } from './dto/create-result-country.dto';
import { Result } from '../entities/result.entity';
import { ResultCountryRepository } from './result-countries.repository';
import { ResultCountry } from './entities/result-country.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { VersionsService } from '../versions/versions.service';
import { ResultCountrySubnationalRepository } from '../result-countries-sub-national/repositories/result-country-subnational.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Injectable()
export class ResultCountriesService {
  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _versionsService: VersionsService,
    private readonly _handlersError: HandlersError,
    private readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
  ) {}

  async create(createResultCountryDto: CreateResultCountryDto, user: TokenDto) {
    try {
      if (!createResultCountryDto?.geo_scope_id) {
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
          createResultCountryDto.geo_scope_id != 3) ||
        createResultCountryDto.geo_scope_id == 4
      ) {
        await this._resultCountryRepository.updateCountries(result.id, []);
        result.has_countries = false;
      } else if (
        createResultCountryDto.geo_scope_id == 3 ||
        createResultCountryDto.has_countries
      ) {
        if (countries) {
          await this._resultCountryRepository.updateCountries(
            result.id,
            createResultCountryDto.countries.map((e) => e.id),
          );
          if (countries?.length) {
            let resultCountryArray: ResultCountry[] = [];
            const existingCountries: ResultCountry[] = [];
            for (let index = 0; index < countries?.length; index++) {
              const exist =
                await this._resultCountryRepository.getResultCountrieByIdResultAndCountryId(
                  result.id,
                  countries[index].id,
                );
              if (!exist) {
                const newCountry = new ResultCountry();
                newCountry.country_id = countries[index].id;
                newCountry.result_id = result.id;
                resultCountryArray.push(newCountry);
              } else {
                existingCountries.push(exist);
              }
            }

            resultCountryArray =
              await this._resultCountryRepository.save(resultCountryArray);
            resultCountryArray = resultCountryArray.concat(existingCountries);

            await Promise.all(
              resultCountryArray.map(async (rc) => {
                const subnationalStringCodes =
                  createResultCountryDto.geo_scope_id == 5
                    ? (
                        countries.find((c) => c.id == rc.country_id)
                          ?.sub_national ?? []
                      ).map((sn) => sn.code)
                    : [];

                await this._resultCountrySubnationalRepository.bulkUpdateSubnational(
                  rc.result_country_id,
                  subnationalStringCodes,
                  user.id,
                );

                await this._resultCountrySubnationalRepository.upsertSubnational(
                  rc.result_country_id,
                  subnationalStringCodes,
                  user.id,
                );
              }),
            );
          }
        }
        if (createResultCountryDto.geo_scope_id == 3) {
          result.has_countries = true;
        } else {
          result.has_countries = createResultCountryDto.has_countries;
        }
      }

      if (countries && createResultCountryDto.geo_scope_id == 3) {
        result.geographic_scope_id =
          createResultCountryDto.countries?.length > 1 ? 3 : 4;
      } else if (
        createResultCountryDto.geo_scope_id == 4 ||
        createResultCountryDto.geo_scope_id == 50
      ) {
        result.geographic_scope_id = 50;
      } else {
        result.geographic_scope_id = createResultCountryDto.geo_scope_id;
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
