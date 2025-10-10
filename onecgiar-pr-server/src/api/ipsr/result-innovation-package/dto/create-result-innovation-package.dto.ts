import { ResultInnovationPackage } from '../entities/result-innovation-package.entity';
import { ClarisaSubnationalScope } from '../../../../clarisa/clarisa-subnational-scope/entities/clarisa-subnational-scope.entity';
import { ADUser } from '../../../../auth/services/active-directory.service';

export class CreateResultInnovationPackageDto {
  public result_id: number;
  public initiative_id: number;
  public geo_scope_id: number;
  public result_innocation_package: ResultInnovationPackage;
  public regions: regionsInterface[];
  public countries: countriesInterface[];
}
export interface regionsInterface {
  id: number;
  name: string;
}
export interface countriesInterface {
  id: number;
  name: string;
  sub_national?: ClarisaSubnationalScope[];
}

export class UpdateGeneralInformationDto {
  public title?: string;
  public description?: string;
  public lead_contact_person?: string;
  public lead_contact_person_data?: ADUser;
  public gender_tag_level_id?: number;
  public gender_impact_area_id?: number;
  public evidence_gender_tag?: string;
  public climate_change_tag_level_id?: number;
  public climate_impact_area_id?: number;
  public evidence_climate_tag?: string;
  public nutrition_tag_level_id?: number;
  public nutrition_impact_area_id?: number;
  public evidence_nutrition_tag?: string;
  public environmental_biodiversity_tag_level_id?: number;
  public environmental_biodiversity_impact_area_id?: number;
  public evidence_environment_tag?: string;
  public poverty_tag_level_id?: number;
  public poverty_impact_area_id?: number;
  public evidence_poverty_tag?: string;
  public is_krs?: boolean;
  public krs_url?: string;
  public is_discontinued!: boolean;
  public discontinued_options!: any[];
}
