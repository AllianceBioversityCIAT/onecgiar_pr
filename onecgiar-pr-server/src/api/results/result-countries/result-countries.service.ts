import { Injectable, HttpStatus } from '@nestjs/common';
import { ResultRepository } from '../result.repository';
import {
  countriesInterface,
  CreateResultCountryDto,
} from './dto/create-result-country.dto';
import { Result } from '../entities/result.entity';
import { ResultCountryRepository } from './result-countries.repository';
import { ResultCountry } from './entities/result-country.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { VersionsService } from '../versions/versions.service';
import { ResultCountrySubnationalRepository } from '../result-countries-sub-national/repositories/result-country-subnational.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { EnumGeoScopeRole } from '../../results-framework-reporting/geo_scope_role/enum/geo_scope_role.enum';

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

  async createV2(
    createResultCountryDto: CreateResultCountryDto,
    user: TokenDto,
  ) {
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

      const {
        geo_scope_id,
        has_countries,
        countries,
        has_extra_countries,
        extra_countries,
        extra_geo_scope_id,
      } = createResultCountryDto;

      let geoScopeRoleId = EnumGeoScopeRole.MAIN;
      await this.handleCountries(
        result,
        countries,
        geo_scope_id,
        has_countries,
        user,
        geoScopeRoleId,
      );

      if (
        extra_geo_scope_id ||
        has_extra_countries ||
        (extra_countries?.length ?? 0) > 0
      ) {
        geoScopeRoleId = EnumGeoScopeRole.EXTRA;
        await this.handleCountries(
          result,
          extra_countries,
          extra_geo_scope_id,
          has_extra_countries,
          user,
          geoScopeRoleId,
        );
      }

      if (countries && geo_scope_id == 3) {
        result.geographic_scope_id = countries?.length > 1 ? 3 : 4;
      } else if (geo_scope_id == 4 || geo_scope_id == 50) {
        result.geographic_scope_id = 50;
      } else {
        result.geographic_scope_id = geo_scope_id;
      }

      if (
        extra_geo_scope_id != null &&
        extra_countries &&
        extra_geo_scope_id == 3
      ) {
        result.extra_geo_scope_id = extra_countries?.length > 1 ? 3 : 4;
      } else if (
        extra_geo_scope_id != null &&
        (extra_geo_scope_id == 4 || extra_geo_scope_id == 50)
      ) {
        result.extra_geo_scope_id = 50;
      } else {
        result.extra_geo_scope_id = extra_geo_scope_id;
      }

      await this._resultRepository.save(result);

      return {
        response: { countries, extra_countries },
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async handleCountries(
    result,
    countries: countriesInterface[] | null | undefined,
    geo_scope_id: number | null | undefined,
    has_countries: boolean | null | undefined,
    user: TokenDto,
    geoScopeRoleId: number = 1,
  ) {
    if ((!has_countries && geo_scope_id != 3) || geo_scope_id == 4) {
      await this._resultCountryRepository.updateCountries(
        result.id,
        [],
        geoScopeRoleId,
      );

      if (geoScopeRoleId === EnumGeoScopeRole.EXTRA)
        result.has_extra_countries = false;
      else result.has_countries = false;

      return;
    }

    if (geo_scope_id == 3 || has_countries) {
      await this._resultCountryRepository.updateCountries(
        result.id,
        countries?.map((e) => e.id) ?? [],
        geoScopeRoleId,
      );

      if (countries?.length) {
        const resultCountryArray = await this.handleResultCountryArray(
          result,
          countries,
          geoScopeRoleId,
        );

        await this.handleSubnationals(
          resultCountryArray,
          countries,
          geo_scope_id,
          user.id,
          geoScopeRoleId,
        );
      }

      if (geoScopeRoleId === EnumGeoScopeRole.EXTRA)
        result.has_extra_countries = geo_scope_id == 3 ? true : !!has_countries;
      else result.has_countries = geo_scope_id == 3 ? true : !!has_countries;
    }
  }

  async handleResultCountryArray(
    result,
    countries: countriesInterface[],
    geoScopeRoleId: number = 1,
  ) {
    const resultCountryArray: ResultCountry[] = [];
    const existingCountries: ResultCountry[] = [];

    const countryIds = countries.map((c) => c.id);
    const existingCountriesBatch =
      await this._resultCountryRepository.getResultCountriesByResultIdAndCountryIds(
        result.id,
        countryIds,
        geoScopeRoleId,
      );
    const existingCountryMap = new Map(
      existingCountriesBatch.map((c) => [c.country_id, c]),
    );

    for (const country of countries) {
      const exist = existingCountryMap.get(country.id);

      if (!exist) {
        const newCountry = new ResultCountry();
        newCountry.country_id = country.id;
        newCountry.result_id = result.id;
        newCountry.geo_scope_role_id = geoScopeRoleId;
        newCountry.is_active = true;
        resultCountryArray.push(newCountry);
      } else {
        existingCountries.push(exist);
      }
    }

    if (resultCountryArray.length) {
      const savedCountries =
        await this._resultCountryRepository.save(resultCountryArray);
      return savedCountries.concat(existingCountries);
    }

    return existingCountries;
  }

  async handleSubnationals(
    resultCountryArray,
    countries,
    geo_scope_id,
    userId,
    geoScopeRoleId: number = 1,
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
          geoScopeRoleId,
        );
        await this._resultCountrySubnationalRepository.upsertSubnational(
          rc.result_country_id,
          subnationalStringCodes,
          userId,
          geoScopeRoleId,
        );
      }),
    );
  }
}
