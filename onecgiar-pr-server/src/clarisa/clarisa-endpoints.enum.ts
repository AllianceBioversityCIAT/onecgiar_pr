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
import { ClarisaImpactArea } from './clarisa-impact-area/entities/clarisa-impact-area.entity';
import { ClarisaGlobalTarget } from './clarisa-global-target/entities/clarisa-global-target.entity';
import { ClarisaImpactAreaIndicator } from './clarisa-impact-area-indicators/entities/clarisa-impact-area-indicator.entity';
import { ClarisaOutcomeIndicator } from './clarisa-outcome-indicators/entities/clarisa-outcome-indicator.entity';
import { ClarisaRegionType } from './clarisa-region-types/entities/clarisa-region-type.entity';
import { ClarisaImpactAreaIndicatorDto } from './dtos/clarisa-impact-area-indicator.dto';
import { ClarisaInstitutionsType } from './clarisa-institutions-type/entities/clarisa-institutions-type.entity';
import { ClarisaInstitutionTypeDto } from './dtos/clarisa-institution-type.dto';
import { ClarisaPolicyStage } from './clarisa-policy-stages/entities/clarisa-policy-stage.entity';
import { ClarisaActionArea } from './clarisa-action-areas/entities/clarisa-action-area.entity';
import { ClarisaInnovationReadinessLevel } from './clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import { ClarisaInnovationCharacteristic } from './clarisa-innovation-characteristics/entities/clarisa-innovation-characteristic.entity';
import { ClarisaActionAreaOutcome } from './clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';
import { ClarisaActionAreaOutcomeDto } from './dtos/clarisa-action-area-outcome.dto';
import { ClarisaGeographicScope } from './clarisa-geographic-scopes/entities/clarisa-geographic-scope.entity';
import { ClarisaGeoscopeDto } from './dtos/clarisa-geoscope.dto';
import { ClarisaCenter } from './clarisa-centers/entities/clarisa-center.entity';
import { ClarisaCgiarEntityTypeDto } from './dtos/clarisa-cgiar-entity-type.dto';
import { ClarisaCgiarEntityDto } from './dtos/clarisa-cgiar-entity.dto';
import { ClarisaPolicyType } from './clarisa-policy-types/entities/clarisa-policy-type.entity';
import { ClarisaSdg } from './clarisa-sdgs/entities/clarisa-sdg.entity';
import { ClarisaSdgsTarget } from './clarisa-sdgs-targets/entities/clarisa-sdgs-target.entity';
import { ClarisaSdgTargetDto } from './dtos/clarisa-sdg-target.dto';
import { ClarisaTocPhase } from './clarisa-toc-phases/entities/clarisa-toc-phase.entity';
import { ClarisaPhaseDto } from './dtos/clarisa-phase.dto';
import { ClarisaSubnationalScope } from './clarisa-subnational-scope/entities/clarisa-subnational-scope.entity';
import { ClarisaPortfolios } from './clarisa-portfolios/entities/clarisa-portfolios.entity';
import { ClarisaPortfolioDto } from './dtos/clarisa-portfolio.dto';

/**
 * Represents a mapping of CLARISA parameters to their corresponding values.
 * Each parameter is optional and can have a value of any type.
 *
 * @template ClarisaParam - The type of the parameter keys.
 */
type Params = {
  [param in ClarisaParam]?: unknown;
};

/**
 * Represents the possible parameters that can be used in Clarisa endpoints.
 *
 * @property {'show'} show - Indicates whether to show active or inactive items.
 * @property {'from'} from - Specifies the starting time (in milis) to fetch items.
 * @property {'version'} version - Denotes the version of the endpoint.
 * @property {'type'} type - Defines the type or category of the item.
 * @property {'status'} status - Represents the current status of the item.
 */
type ClarisaParam = 'show' | 'from' | 'version' | 'type' | 'status';

/**
 * Represents the HTTP methods that can be used in requests.
 *
 * @example
 * const method: HttpMethod = 'GET';
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * The `ClarisaEndpoints` class defines a set of static readonly properties representing various endpoints
 * for the Clarisa API. Each endpoint is represented by an instance of the `ClarisaEndpoints` class, which
 * includes the path, HTTP method, entity type, optional mapper function, and optional parameters.
 *
 * @template Entity - The type of the entity associated with the endpoint.
 * @template Dto - The type of the data transfer object (DTO) associated with the endpoint.
 */
export class ClarisaEndpoints<Entity, Dto> {
  /**
   * Represents the endpoint configuration for fetching all institutions.
   */
  public static readonly INSTITUTIONS_FULL = new ClarisaEndpoints(
    'institutions',
    'GET',
    ClarisaInstitution,
    ClarisaEndpoints.institutionMapper,
    { show: 'all' },
  );

  /**
   * Represents the endpoint configuration for fetching all UN regions.
   */
  public static readonly UN_REGIONS = new ClarisaEndpoints(
    'regions/un-regions',
    'GET',
    ClarisaRegion,
    ClarisaEndpoints.unRegionMapper,
  );

  /**
   * Represents the endpoint configuration for fetching all countries.
   */
  public static readonly COUNTRIES = new ClarisaEndpoints(
    'countries',
    'GET',
    ClarisaCountry,
    ClarisaEndpoints.countryMapper,
  );

  /**
   * Represents the endpoint configuration for fetching all Melia study types.
   */
  public static readonly MELIA_STUDY_TYPES = new ClarisaEndpoints(
    'study-types',
    'GET',
    ClarisaMeliaStudyType,
  );

  /**
   * Represents the endpoint configuration for fetching all action areas.
   */
  public static readonly ACTION_AREAS = new ClarisaEndpoints(
    'action-areas',
    'GET',
    ClarisaActionArea,
  );

  /**
   * Represents the endpoint configuration for fetching all CGIAR entity types (version 2).
   */
  public static readonly CGIAR_ENTITY_TYPES = new ClarisaEndpoints(
    'cgiar-entity-typology',
    'GET',
    ClarisaCgiarEntityType,
    (data: ClarisaCgiarEntityTypeDto[]) =>
      data as DeepPartial<ClarisaCgiarEntityType>[],
    { version: 2 },
  );

  /**
   * Represents the endpoint configuration for fetching all initiatives.
   */
  public static readonly INITIATIVES = new ClarisaEndpoints(
    'cgiar-entities/by-portfolio?portfolioId=2,3&version=2',
    'GET',
    ClarisaInitiative,
  );

  /**
   * Represents the endpoint configuration for fetching all impact areas.
   */
  public static readonly IMPACT_AREAS = new ClarisaEndpoints(
    'impact-areas',
    'GET',
    ClarisaImpactArea,
  );

  /**
   * Represents the endpoint configuration for fetching all global targets.
   */
  public static readonly GLOBAL_TARGETS = new ClarisaEndpoints(
    'global-targets',
    'GET',
    ClarisaGlobalTarget,
  );

  /**
   * Represents the endpoint configuration for fetching all impact area indicators.
   */
  public static readonly IMPACT_AREA_INDICATORS = new ClarisaEndpoints(
    'impact-area-indicators',
    'GET',
    ClarisaImpactAreaIndicator,
    ClarisaEndpoints.impactAreaIndicatorMapper,
  );

  /**
   * Represents the endpoint configuration for fetching all outcome indicators.
   */
  public static readonly OUTCOME_INDICATORS = new ClarisaEndpoints(
    'outcome-indicators',
    'GET',
    ClarisaOutcomeIndicator,
  );

  /**
   * Represents the endpoint configuration for fetching all region types.
   */
  public static readonly REGION_TYPES = new ClarisaEndpoints(
    'region-types',
    'GET',
    ClarisaRegionType,
  );

  /**
   * Represents the endpoint configuration for fetching all institution types.
   */
  public static readonly INSTITUTION_TYPES = new ClarisaEndpoints(
    'institution-types',
    'GET',
    ClarisaRegionType,
    ClarisaEndpoints.institutionTypeMapper,
    { type: 'all' },
  );

  /**
   * Represents the endpoint configuration for fetching all policy stages.
   */
  public static readonly POLICY_STAGES = new ClarisaEndpoints(
    'policy-stages',
    'GET',
    ClarisaPolicyStage,
  );

  /**
   * Represents the endpoint configuration for fetching all innovation types.
   */
  public static readonly INNOVATION_TYPES = new ClarisaEndpoints(
    'innovation-types',
    'GET',
    ClarisaInnovationType,
  );

  /**
   * Represents the endpoint configuration for fetching all innovation readiness levels.
   */
  public static readonly INNOVATION_READINESS_LEVELS = new ClarisaEndpoints(
    'innovation-readiness-levels',
    'GET',
    ClarisaInnovationReadinessLevel,
  );

  /**
   * Represents the endpoint configuration for fetching all innovation characteristics.
   */
  public static readonly INNOVATION_CHARACTERISTICS = new ClarisaEndpoints(
    'innovation-characteristics',
    'GET',
    ClarisaInnovationCharacteristic,
  );

  /**
   * Represents the endpoint configuration for fetching all action area outcomes.
   */
  public static readonly ACTION_AREA_OUTCOMES = new ClarisaEndpoints(
    'action-area-outcomes',
    'GET',
    ClarisaActionAreaOutcome,
    ClarisaEndpoints.actionAreaOutcomeMapper,
  );

  /**
   * Represents the endpoint configuration for fetching all legacy geographic scopes.
   */
  public static readonly GEOSCOPES = new ClarisaEndpoints(
    'geographic-scopes',
    'GET',
    ClarisaGeographicScope,
    ClarisaEndpoints.geographicScopeMapper,
    { type: 'legacy' },
  );

  /**
   * Represents the endpoint configuration for fetching all CGIAR entities.
   */
  public static readonly CGIAR_ENTITIES = new ClarisaEndpoints(
    'cgiar-entities',
    'GET',
    ClarisaCenter,
    ClarisaEndpoints.cgiarEntityMapper,
  );

  /**
   * Represents the endpoint configuration for fetching all policy types.
   */
  public static readonly POLICY_TYPES = new ClarisaEndpoints(
    'policy-types',
    'GET',
    ClarisaPolicyType,
  );

  /**
   * Represents the endpoint configuration for fetching all SDGs.
   */
  public static readonly SDGS = new ClarisaEndpoints('sdgs', 'GET', ClarisaSdg);

  /**
   * Represents the endpoint configuration for fetching all SDG targets.
   */
  public static readonly SDG_TARGETS = new ClarisaEndpoints(
    'sdg-targets',
    'GET',
    ClarisaSdgsTarget,
    ClarisaEndpoints.sdgTargetMapper,
  );

  /**
   * Represents the endpoint configuration for fetching all ToC phases (active or not, and open or closed).
   */
  public static readonly TOC_PHASES = new ClarisaEndpoints(
    'phases/by-application/toc',
    'GET',
    ClarisaTocPhase,
    ClarisaEndpoints.phaseMapper,
    { show: 'all', status: 'all' },
  );

  /**
   * Represents the endpoint configuration for fetching all subnational scopes.
   */
  public static readonly SUBNATIONAL_SCOPES = new ClarisaEndpoints(
    'subnational-scope',
    'GET',
    ClarisaSubnationalScope,
  );

  public static readonly PORTFOLIO = new ClarisaEndpoints(
    'portfolios?show=all',
    'GET',
    ClarisaPortfolios,
    ClarisaEndpoints.portfolioMapper,
  );

  /**
   * Constructs a new CLARISA endpoint.
   *
   * @param path - The endpoint path.
   * @param method - The HTTP method (currently not used).
   * @param entity - The entity constructor function.
   * @param mapper - An optional function to map DTOs to partial entities.
   * @param params - Optional parameters for the endpoint.
   */
  private constructor(
    public path: string,
    public method: HttpMethod,
    public entity: new () => Entity,
    public mapper?: (data: Dto[]) => DeepPartial<Entity>[],
    public params?: Params,
  ) {}

  /**
   * Maps an array of `ClarisaInstitutionDto` objects to an array of `DeepPartial<ClarisaInstitution>` objects.
   *
   * @param data - An array of `ClarisaInstitutionDto` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaInstitution>` objects.
   *
   * The mapping process includes:
   * - Filtering the `countryOfficeDTO` array to find headquarters.
   */
  static institutionMapper(
    data: ClarisaInstitutionDto[],
  ): DeepPartial<ClarisaInstitution>[] {
    return data.map((item) => {
      const hqarray: any[] = item.countryOfficeDTO.filter(
        (hq) => hq.isHeadquarter,
      );

      return {
        ...item,
        institution_type_code: item.institutionType.code ?? null,
        id: item.code,
        website_link: item.websiteLink,
        headquarter_country_iso2: hqarray.length ? hqarray[0].isoAlpha2 : null,
      };
    });
  }

  /**
   * Maps an array of `ClarisaUnRegionDto` objects to an array of `DeepPartial<ClarisaRegion>` objects.
   *
   * @param data - An array of `ClarisaUnRegionDto` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaRegion>` objects with the `parent_regions_code` property
   *          set to the `um49Code` of the `parentRegion` or `null` if `parentRegion` is not defined.
   */
  static unRegionMapper(
    data: ClarisaUnRegionDto[],
  ): DeepPartial<ClarisaRegion>[] {
    return data.map((item) => {
      return {
        ...item,
        parent_regions_code: item.parentRegion?.um49Code ?? null,
      };
    });
  }

  /**
   * Maps an array of `ClarisaCountryDto` objects to an array of `DeepPartial<ClarisaCountry>` objects.
   *
   * @param data - An array of `ClarisaCountryDto` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaCountry>` objects with the mapped properties.
   */
  static countryMapper(
    data: ClarisaCountryDto[],
  ): DeepPartial<ClarisaCountry>[] {
    return data.map((item) => {
      return {
        id: item.code,
        iso_alpha_2: item.isoAlpha2,
        iso_alpha_3: item.isoAlpha3,
        name: item.name,
      };
    });
  }

  /**
   * Maps an array of `ClarisaImpactAreaIndicatorDto` objects to an array of `DeepPartial<ClarisaImpactAreaIndicator>` objects.
   *
   * @param data - An array of `ClarisaImpactAreaIndicatorDto` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaImpactAreaIndicator>` objects.
   */
  static impactAreaIndicatorMapper(
    data: ClarisaImpactAreaIndicatorDto[],
  ): DeepPartial<ClarisaImpactAreaIndicator>[] {
    return data.map((item) => {
      return {
        id: item.indicatorId,
        indicator_statement: item.indicatorStatement,
        target_year: item.targetYear,
        target_unit: item.targetUnit,
        value: item.value || null,
        is_aplicable_projected_benefits: item.isAplicableProjectedBenefits,
        impact_area_id: item.impactAreaId,
        name: item.impactAreaName,
      };
    });
  }

  /**
   * Maps an array of `ClarisaInstitutionTypeDto` objects to an array of `DeepPartial<ClarisaInstitutionsType>` objects.
   *
   * @param data - An array of `ClarisaInstitutionTypeDto` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaInstitutionsType>` objects with the mapped properties.
   */
  static institutionTypeMapper(
    data: ClarisaInstitutionTypeDto[],
  ): DeepPartial<ClarisaInstitutionsType>[] {
    return data.map((item) => {
      return {
        code: item.code,
        is_legacy: item.legacy,
      };
    });
  }

  /**
   * Maps and filters unique ClarisaActionAreaOutcome objects based on their outcomeSMOcode and actionAreaId.
   *
   * @param data - An array of ClarisaActionAreaOutcomeDto objects to be processed.
   * @returns An array of unique DeepPartial<ClarisaActionAreaOutcome> objects.
   */
  static actionAreaOutcomeMapper(
    data: ClarisaActionAreaOutcomeDto[],
  ): DeepPartial<ClarisaActionAreaOutcome>[] {
    const uniqueData: DeepPartial<ClarisaActionAreaOutcome>[] = [];
    const smoCodeTracker: { [key: string]: boolean } = {};

    for (const aao of data) {
      const { outcomeSMOcode, actionAreaId } = aao;
      const key = `${outcomeSMOcode}-${actionAreaId}`;

      if (!smoCodeTracker[key]) {
        smoCodeTracker[key] = true;
        uniqueData.push(aao);
      }
    }

    return uniqueData;
  }

  /**
   * Maps an array of `ClarisaGeoscopeDto` objects to an array of `DeepPartial<ClarisaGeographicScope>` objects.
   * Additionally, a default object with a predefined `id`, `name`, and empty `description` is appended to the result.
   *
   * @param data - An array of `ClarisaGeoscopeDto` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaGeographicScope>` objects.
   */
  static geographicScopeMapper(
    data: ClarisaGeoscopeDto[],
  ): DeepPartial<ClarisaGeographicScope>[] {
    const mappedData = data.map((item) => {
      return {
        id: item.code,
        name: item.name,
        description: item.definition,
      };
    });

    mappedData.push({
      id: 50,
      description: '',
      name: 'This is yet to be determined',
    });

    return mappedData;
  }

  /**
   * Maps an array of `ClarisaCgiarEntityDto` objects to an array of `DeepPartial<ClarisaCenter>` objects.
   * Filters the input data to include only entities with `cgiarEntityTypeDTO` codes 4 or 21.
   *
   * @param data - An array of `ClarisaCgiarEntityDto` objects to be filtered and mapped.
   * @returns An array of `DeepPartial<ClarisaCenter>` objects that match the filter criteria.
   */
  static cgiarEntityMapper(
    data: ClarisaCgiarEntityDto[],
  ): DeepPartial<ClarisaCenter>[] {
    return data.filter(
      (item) =>
        item.cgiarEntityTypeDTO?.code == 4 ||
        item.cgiarEntityTypeDTO?.code == 21,
    ) as DeepPartial<ClarisaCenter>[];
  }

  /**
   * Maps an array of `ClarisaSdgTargetDto` objects to an array of `DeepPartial<ClarisaSdgsTarget>` objects.
   *
   * @param data - An array of `ClarisaSdgTargetDto` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaSdgsTarget>` objects.
   */
  static sdgTargetMapper(
    data: ClarisaSdgTargetDto[],
  ): DeepPartial<ClarisaSdgsTarget>[] {
    return data.map((item) => {
      return {
        id: item.id,
        sdg_target_code: item.sdgTargetCode,
        sdg_target: item.sdgTarget,
        usnd_code: item.sdg?.usndCode,
      };
    });
  }

  /**
   * Maps an array of `ClarisaPhaseDto` objects to an array of `DeepPartial<ClarisaTocPhase>` objects.
   *
   * @param data - An array of `ClarisaPhaseDto` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaTocPhase>` objects with the `phase_id` property set to the value of `phaseId` from the input objects.
   */
  static phaseMapper(data: ClarisaPhaseDto[]): DeepPartial<ClarisaTocPhase>[] {
    return data.map((item) => {
      return {
        ...item,
        phase_id: item.phaseId,
      };
    });
  }

  /**
   * Maps an array of `ClarisaPortfolios` objects to an array of `DeepPartial<ClarisaPortfolios>` objects.
   *
   * @param data - An array of `ClarisaPortfolios` objects to be mapped.
   * @returns An array of `DeepPartial<ClarisaPortfolios>` objects.
   */
  static portfolioMapper(
    data: ClarisaPortfolioDto[],
  ): DeepPartial<ClarisaPortfolios>[] {
    return data.map((item) => {
      return {
        id: item.code,
        name: item.name,
        startDate: item.start_date,
        endDate: item.end_date,
        isActive: item.is_active,
        acronym: item.acronym,
      };
    });
  }
}
