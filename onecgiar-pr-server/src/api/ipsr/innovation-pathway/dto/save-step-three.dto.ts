import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { Ipsr } from '../../entities/ipsr.entity';
import { ResultsIpActor } from '../../results-ip-actors/entities/results-ip-actor.entity';
import { ResultsIpInstitutionType } from '../../results-ip-institution-type/entities/results-ip-institution-type.entity';
import { ResultsByIpInnovationUseMeasure } from '../../results-by-ip-innovation-use-measures/entities/results-by-ip-innovation-use-measure.entity';
import { IpsrMaterials } from './save-step-four.dto';

export class SaveStepTwoThree {
  public result_innovation_package: ResultInnovationPackage;
  public result_ip_result_core: Ipsr;
  public innovatonUse: InnovatonUseInterface;
  public result_ip_result_complementary: Ipsr[];
  public result_core_innovation: any;
  public ipsr_materials: IpsrMaterials[];
}

class InnovatonUseInterface {
  public actors: ResultsIpActor[];
  public organization: ResultsIpInstitutionType[];
  public measures: ResultsByIpInnovationUseMeasure[];
}
