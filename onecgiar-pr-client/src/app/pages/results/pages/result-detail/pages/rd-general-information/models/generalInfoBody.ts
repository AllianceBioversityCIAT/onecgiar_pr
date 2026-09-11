import { User } from './userSearchResponse';

export class GeneralInfoBody {
  public result_type_name: string = null;
  public result_level_name: string = null;
  public result_id: number = null;
  public initiative_id: number = null;
  public result_type_id: number = null;
  public result_level_id: number = null;
  public result_name: string = null;
  public result_description: string = null;
  public gender_tag_id: number = null;
  public climate_change_tag_id: number = null;
  public institutions: institutionsInterface[] = [];
  public institutions_type: institutionsTypeInterface[] = [];
  public krs_url: string = null;
  public is_krs: boolean = null;
  public reporting_year: string = null;
  public lead_contact_person: string = null;
  lead_contact_person_data: User | null;
  public nutrition_tag_level_id = null;
  public environmental_biodiversity_tag_level_id = null;
  public poverty_tag_level_id = null;
  public is_discontinued: boolean;
  public discontinued_options: any[] = [];

  /**
   * P2-3292 Steps 3A / 3B — where this innovation continued, when it is closed because it merged
   * into another innovation or was split into several.
   *
   * One entry per target, so "split into three" carries three entries. The transition type travels
   * with each one because the server stores them in the same table and tells them apart by it.
   *
   * ⚠️ Declared here and NOT only on the section body: this is the model the template typechecks
   * against, and `npm run build:dev` is the only gate that would catch it missing — `tsc --noEmit`
   * and Jest both compile a template binding to a property that does not exist. That exact gap
   * produced two red builds on 2 Sep.
   */
  public merge_split_targets: InnovationTransition[] = [];
  public is_replicated: boolean = false;
  public result_code: string | number = null;
  gender_impact_area_id = null;
  climate_impact_area_id = null;
  nutrition_impact_area_id = null;
  environmental_biodiversity_impact_area_id = null;
  poverty_impact_area_id = null;
}

interface institutionsInterface {
  institutions_id: number;
  is_active: boolean;
  institutions_type_name: string;
}

interface institutionsTypeInterface {
  institution_types_id: number;
  is_active: boolean;
  institutions_type_name: string;
}

/** P2-3292 Step 3 — one declared continuation of a discontinued innovation. */
export interface InnovationTransition {
  target_result_id: number;
  transition_type: 'merge' | 'split';
}
