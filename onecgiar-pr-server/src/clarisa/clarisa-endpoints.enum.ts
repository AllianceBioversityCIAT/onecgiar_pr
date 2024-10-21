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

type Params = {
  [param in ClarisaParam]?: unknown;
};

type ClarisaParam = 'show' | 'from' | 'version' | 'type' | 'status';

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
    ClarisaRegion,
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
    ClarisaActionArea,
  );

  public static readonly CGIAR_ENTITY_TYPES = new ClarisaEndpoints(
    'cgiar-entity-typology',
    'GET',
    ClarisaCgiarEntityType,
    (data: ClarisaCgiarEntityTypeDto[]) =>
      data as DeepPartial<ClarisaCgiarEntityType>[],
    { version: 2 },
  );

  public static readonly INITIATIVES = new ClarisaEndpoints(
    'initiatives',
    'GET',
    ClarisaInitiative,
  );

  public static readonly IMPACT_AREAS = new ClarisaEndpoints(
    'impact-areas',
    'GET',
    ClarisaImpactArea,
  );

  public static readonly GLOBAL_TARGETS = new ClarisaEndpoints(
    'global-targets',
    'GET',
    ClarisaGlobalTarget,
  );

  public static readonly IMPACT_AREA_INDICATORS = new ClarisaEndpoints(
    'impact-area-indicators',
    'GET',
    ClarisaImpactAreaIndicator,
    ClarisaEndpoints.impactAreaIndicatorMapper,
  );

  public static readonly OUTCOME_INDICATORS = new ClarisaEndpoints(
    'outcome-indicators',
    'GET',
    ClarisaOutcomeIndicator,
  );

  public static readonly REGION_TYPES = new ClarisaEndpoints(
    'region-types',
    'GET',
    ClarisaRegionType,
  );

  public static readonly INSTITUTION_TYPES = new ClarisaEndpoints(
    'institution-types',
    'GET',
    ClarisaRegionType,
    ClarisaEndpoints.institutionTypeMapper,
    { type: 'all' },
  );

  public static readonly POLICY_STAGES = new ClarisaEndpoints(
    'policy-stages',
    'GET',
    ClarisaPolicyStage,
  );

  public static readonly INNOVATION_TYPES = new ClarisaEndpoints(
    'innovation-types',
    'GET',
    ClarisaInnovationType,
  );

  public static readonly INNOVATION_READINESS_LEVELS = new ClarisaEndpoints(
    'innovation-readiness-levels',
    'GET',
    ClarisaInnovationReadinessLevel,
  );

  public static readonly INNOVATION_CHARACTERISTICS = new ClarisaEndpoints(
    'innovation-characteristics',
    'GET',
    ClarisaInnovationCharacteristic,
  );

  public static readonly ACTION_AREA_OUTCOMES = new ClarisaEndpoints(
    'action-area-outcomes',
    'GET',
    ClarisaActionAreaOutcome,
    ClarisaEndpoints.actionAreaOutcomeMapper,
  );

  public static readonly GEOSCOPES = new ClarisaEndpoints(
    'geographic-scopes',
    'GET',
    ClarisaGeographicScope,
    ClarisaEndpoints.geographicScopeMapper,
    { type: 'legacy' },
  );

  public static readonly CGIAR_ENTITIES = new ClarisaEndpoints(
    'cgiar-entities',
    'GET',
    ClarisaCenter,
    ClarisaEndpoints.cgiarEntityMapper,
  );

  public static readonly POLICY_TYPES = new ClarisaEndpoints(
    'policy-types',
    'GET',
    ClarisaPolicyType,
  );

  public static readonly SDGS = new ClarisaEndpoints('sdgs', 'GET', ClarisaSdg);

  public static readonly SDG_TARGETS = new ClarisaEndpoints(
    'sdg-targets',
    'GET',
    ClarisaSdgsTarget,
    ClarisaEndpoints.sdgTargetMapper,
  );

  public static readonly TOC_PHASES = new ClarisaEndpoints(
    'phases/by-application/toc',
    'GET',
    ClarisaTocPhase,
    ClarisaEndpoints.phaseMapper,
    { show: 'all', status: 'all' },
  );

  public static readonly SUBNATIONAL_SCOPES = new ClarisaEndpoints(
    'subnational-scope',
    'GET',
    ClarisaSubnationalScope,
  );

  private constructor(
    public path: string,
    public method: HttpMethod, // not used for now
    public entity: new () => Entity,
    public mapper?: (data: Dto[]) => DeepPartial<Entity>[],
    public params?: Params,
  ) {}

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

  static cgiarEntityMapper(
    data: ClarisaCgiarEntityDto[],
  ): DeepPartial<ClarisaCenter>[] {
    return data.filter(
      (item) =>
        item.cgiarEntityTypeDTO?.code == 4 ||
        item.cgiarEntityTypeDTO?.code == 21,
    ) as DeepPartial<ClarisaCenter>[];
  }

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

  static phaseMapper(data: ClarisaPhaseDto[]): DeepPartial<ClarisaTocPhase>[] {
    return data.map((item) => {
      return {
        ...item,
        phase_id: item.phaseId,
      };
    });
  }
}
