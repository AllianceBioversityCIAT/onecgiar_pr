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
      await this.handleCountries(
        result,
        countries,
        createResultCountryDto.geo_scope_id,
        createResultCountryDto.has_countries,
        user,
      );

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

  async handleCountries(
    result,
    countries,
    geo_scope_id,
    has_countries,
    user: TokenDto,
  ) {
    if ((!has_countries && geo_scope_id != 3) || geo_scope_id == 4) {
      await this._resultCountryRepository.updateCountries(result.id, []);
      result.has_countries = false;
    } else if (geo_scope_id == 3 || has_countries) {
      if (countries) {
        await this._resultCountryRepository.updateCountries(
          result.id,
          countries.map((e) => e.id),
        );
        if (countries?.length) {
          const resultCountryArray = await this.handleResultCountryArray(
            result,
            countries,
          );
          await this.handleSubnationals(
            resultCountryArray,
            countries,
            geo_scope_id,
            user.id,
          );
        }
      }
      result.has_countries = geo_scope_id == 3 ? true : has_countries;
    }
  }

  async handleResultCountryArray(result, countries) {
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
    return resultCountryArray.concat(existingCountries);
  }

  async handleSubnationals(
    resultCountryArray,
    countries,
    geo_scope_id,
    userId,
  ) {
    await Promise.all(
      resultCountryArray.map(async (rc) => {
        const subnationalStringCodes =
          geo_scope_id == 5
            ? (
                countries.find((c) => c.id == rc.country_id)?.sub_national ?? []
              ).map((sn) => sn.code)
            : [];
        await this._resultCountrySubnationalRepository.bulkUpdateSubnational(
          rc.result_country_id,
          subnationalStringCodes,
          userId,
        );
        await this._resultCountrySubnationalRepository.upsertSubnational(
          rc.result_country_id,
          subnationalStringCodes,
          userId,
        );
      }),
    );
  }
}
