import { DeepPartial } from 'typeorm';
import { ClarisaInnovationType } from './clarisa-innovation-type/entities/clarisa-innovation-type.entity';
import { ClarisaInstitutionDto } from './dtos/clarisa-institution.dto';
import { ClarisaInstitution } from './clarisa-institutions/entities/clarisa-institution.entity';
import { ClarisaUnRegionDto } from './dtos/clarisa-un-region.dto';
import { ClarisaRegion } from './clarisa-regions/entities/clarisa-region.entity';
import { ClarisaCountry } from './clarisa-countries/entities/clarisa-country.entity';
import { ClarisaCountryDto } from './dtos/clarisa-country.dto';
import { ClarisaMeliaStudyType } from './clarisa-melia-study-type/entities/clarisa-melia-study-type.entity';
import { ClarisaCgiarEntityType } from './clarisa-cgiar-entity-types/entities/clarisa-cgiar-entity-type.entity';
import { ClarisaInitiative } from './clarisa-initiatives/entities/clarisa-initiative.entity';

type Params = {
  [param in ClarisaParam]?: unknown;
};

type ClarisaParam = 'show' | 'from' | 'version';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class ClarisaEndpoints<Entity, Dto> {
  public static readonly INSTITUTIONS_FULL = new ClarisaEndpoints(
    'institutions',
    'GET',
    ClarisaInstitution,
    ClarisaEndpoints.institutionMapper,
    { show: 'all' },
  );

  public static readonly UN_REGIONS = new ClarisaEndpoints(
    'regions/un-regions',
    'GET',
    ClarisaInnovationType,
    ClarisaEndpoints.unRegionMapper,
  );

  public static readonly COUNTRIES = new ClarisaEndpoints(
    'countries',
    'GET',
    ClarisaCountry,
    ClarisaEndpoints.countryMapper,
  );

  public static readonly MELIA_STUDY_TYPES = new ClarisaEndpoints(
    'study-types',
    'GET',
    ClarisaMeliaStudyType,
  );

  public static readonly ACTION_AREAS = new ClarisaEndpoints(
    'action-areas',
    'GET',
    ClarisaMeliaStudyType,
  );

  public static readonly ENTITY_TYPES = new ClarisaEndpoints(
    'cgiar-entity-typology',
    'GET',
    ClarisaCgiarEntityType,
    undefined,
    { version: 2 },
  );

  public static readonly INITIATIVES = new ClarisaEndpoints(
    'initiatives',
    'GET',
    ClarisaInitiative,
  );

  private constructor(
    public path: string,
    public method: HttpMethod, // not used for now
    public entity: new () => Entity,
    public mapper?: (data: Dto) => DeepPartial<Entity>,
    public params?: Params,
  ) {}

  static institutionMapper(
    data: ClarisaInstitutionDto,
  ): DeepPartial<ClarisaInstitution> {
    const hqarray: any[] = data.countryOfficeDTO.filter(
      (hq) => hq.isHeadquarter,
    );
    return {
      ...data,
      institution_type_code: data.institutionType.code ?? null,
      id: data.code,
      website_link: data.websiteLink,
      headquarter_country_iso2: hqarray.length ? hqarray[0].isoAlpha2 : null,
    };
  }

  static unRegionMapper(data: ClarisaUnRegionDto): DeepPartial<ClarisaRegion> {
    return {
      ...data,
      parent_regions_code: data.parentRegion?.um49Code ?? null,
    };
  }

  static countryMapper(data: ClarisaCountryDto): DeepPartial<ClarisaCountry> {
    return {
      id: data.code,
      iso_alpha_2: data.isoAlpha2,
      iso_alpha_3: data.isoAlpha3,
      name: data.name,
    };
  }
}
