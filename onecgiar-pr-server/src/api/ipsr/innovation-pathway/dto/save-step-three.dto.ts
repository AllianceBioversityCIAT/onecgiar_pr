import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { Ipsr } from '../../entities/ipsr.entity';
import { ResultsIpActor } from '../../results-ip-actors/entities/results-ip-actor.entity';
import { ResultsIpInstitutionType } from '../../results-ip-institution-type/entities/results-ip-institution-type.entity';
import { ResultsByIpInnovationUseMeasure } from '../../results-by-ip-innovation-use-measures/entities/results-by-ip-innovation-use-measure.entity';
import { ResultIpExpertWorkshopOrganized } from '../entities/result-ip-expert-workshop-organized.entity';
import { EvidencesCreateInterface } from '../../../results/evidences/dto/create-evidence.dto';

/**
 * P2-3824 — one piece of IPSR Step 3 evidence as the GET returns it. `legacy: true` marks the
 * synthetic item built from the old single-link column when a level has no evidence row yet
 * (`id` is then null, and saving the list turns it into a real row).
 */
export interface IpsrStepThreeEvidence {
  id: number | null;
  link: string;
  description: string | null;
  is_sharepoint: boolean;
  is_public_file: boolean | null;
  sp_document_id: string | null;
  sp_evidence_id: number | null;
  sp_file_name: string | null;
  sp_folder_path: string | null;
  gender_related: boolean;
  youth_related: boolean;
  nutrition_related: boolean;
  environmental_biodiversity_related: boolean;
  poverty_related: boolean;
  innovation_use_related: boolean;
  legacy?: boolean;
}

/**
 * P2-3824 — a Step 3 component (core or enabler) with its two evidence lists. On save an ABSENT
 * list (`undefined`) leaves that level untouched — older clients and the Step 1 save path send the
 * component without them; an empty array means "the reporter removed every piece".
 */
export type IpsrStepThreeComponent = Ipsr & {
  readiness_evidences?: (EvidencesCreateInterface | IpsrStepThreeEvidence)[];
  use_evidences?: (EvidencesCreateInterface | IpsrStepThreeEvidence)[];
};

/** P2-3824 — Impact Areas the package scored (2) Principal in General information. */
export type IpsrPrincipalImpactArea =
  | 'gender'
  | 'climate'
  | 'nutrition'
  | 'environment'
  | 'poverty';

export class SaveStepTwoThree {
  public result_innovation_package: ResultInnovationPackage;
  public result_ip_result_core: IpsrStepThreeComponent;
  public innovatonUse: InnovatonUseInterface;
  public result_ip_result_complementary: IpsrStepThreeComponent[];
  public result_core_innovation: any;
  public result_ip_expert_workshop_organized: ResultIpExpertWorkshopOrganized[];
  /** P2-3824 — GET only; ignored on save. */
  public principal_impact_areas?: IpsrPrincipalImpactArea[];
}

class InnovatonUseInterface {
  public actors: ResultsIpActor[];
  public organization: ResultsIpInstitutionType[];
  public measures: ResultsByIpInnovationUseMeasure[];
}
