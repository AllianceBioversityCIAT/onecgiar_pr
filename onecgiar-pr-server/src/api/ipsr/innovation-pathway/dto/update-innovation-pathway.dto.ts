import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { CreateInnovationPackagingExpertDto } from '../../innovation-packaging-experts/dto/create-innovation-packaging-expert.dto';
import { ResultsByInstitutionType } from '../../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultActor } from '../../../results/result-actors/entities/result-actor.entity';
import { ResultIpMeasure } from '../../result-ip-measures/entities/result-ip-measure.entity';
import { CreateResultIPDto } from '../../result-innovation-package/dto/create-result-ip.dto';
import { PartialType } from '@nestjs/mapped-types';
import { CreateComplementaryInnovationDto } from './create-complementary-innovation.dto';
import { ClarisaSubnationalScope } from '../../../../clarisa/clarisa-subnational-scope/entities/clarisa-subnational-scope.entity';
import { ResultIpExpertWorkshopOrganized } from '../entities/result-ip-expert-workshop-organized.entity';
import { Ipsr } from '../../entities/ipsr.entity';

export class UpdateInnovationPathwayDto {
  public result_id: number;
  public geo_scope_id: number;
  public result_by_innovation_package_id: number;
  public title: string;
  public experts: CreateInnovationPackagingExpertDto[];
  public result_ip: ResultInnovationPackage & CreateResultIPDto;
  public innovatonUse: InnovatonUseInterface;
  public institutions: InstitutionsInterface[];
  public sdgTargets: SdgTargetsInterface[];
  public eoiOutcomes: EoiOutcomesInterface[];
  public actionAreaOutcomes: ActionAreaOutcomesInterface[];
  public impactAreas: ImpactAreasInterface[];
  public experts_is_diverse!: boolean;
  public is_not_diverse_justification!: string;
  public regions: RegionsInterface[];
  public countries: CountriesInterface[];
  public scalig_ambition?: ScaligAmbition;
  public link_workshop_list: string;
  public result_ip_result_core: Ipsr;
  public result_ip_expert_workshop_organized: ResultIpExpertWorkshopOrganized[];
}

export interface RegionsInterface {
  id: number;
  name: string;
}
export interface CountriesInterface {
  id: number;
  name: string;
  sub_national?: ClarisaSubnationalScope[];
}

export interface EoiOutcomesInterface {
  toc_result_id: number;
}
export interface ActionAreaOutcomesInterface {
  action_area_outcome_id: number;
}
export interface ImpactAreasInterface {
  targetId: number;
}
export interface SdgTargetsInterface {
  usnd_code: number;
  id: number;
}

export interface InnovatonUseInterface {
  actors: ResultActor[];
  organization: ResultsByInstitutionType[];
  measures: ResultIpMeasure[];
}

interface InstitutionsInterface {
  institutions_id: number;
  deliveries?: number[];
}

interface ScaligAmbition {
  title?: string;
  body?: string;
}

export class UpdateComplementaryInnovationDto extends PartialType(
  CreateComplementaryInnovationDto,
) {}
