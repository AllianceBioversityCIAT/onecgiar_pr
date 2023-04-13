import { HttpStatus, Injectable, Type } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError, returnDataDto } from '../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Version } from '../../results/versions/entities/version.entity';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { SaveStepTwoThree } from './dto/save-step-three.dto';
import { ResultsByIpInnovationUseMeasureRepository } from '../results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpActorRepository } from '../results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../results-ip-institution-type/results-ip-institution-type.repository';
import { ResultsIpActor } from '../results-ip-actors/entities/results-ip-actor.entity';
import { ResultsByIpInnovationUseMeasure } from '../results-by-ip-innovation-use-measures/entities/results-by-ip-innovation-use-measure.entity';
import { IpsrRepository } from '../ipsr.repository';
import { IsNull } from 'typeorm';

@Injectable()
export class InnovationPathwayStepThreeService {
  constructor(
    protected readonly _versionsService: VersionsService,
    protected readonly _handlersError: HandlersError,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultIpSdgsTargetsRepository: ResultIpSdgTargetRepository,
    protected readonly _resultComplementaryInnovation: ResultsComplementaryInnovationRepository,
    protected readonly _resultsByIpInnovationUseMeasureRepository: ResultsByIpInnovationUseMeasureRepository,
    protected readonly _resultsIpActorRepository: ResultsIpActorRepository,
    protected readonly _resultsIpInstitutionTypeRepository: ResultsIpInstitutionTypeRepository,
    protected readonly _evidence: EvidencesRepository,
  ) { }

  async saveComplementaryinnovation(resultId: number, user: TokenDto, saveData: SaveStepTwoThree) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true
        }
      });

      if (!result) {
        throw {
          response: resultId,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;

      const {
        result_innovation_package: result_ip, 
        result_ip_result_core: result_ip_core, 
        result_ip_result_complementary: result_ip_complementary} = saveData;
      
      await this._resultInnovationPackageRepository.update(
        result_ip.result_innovation_package_id,
        {
          is_expert_workshop_organized: result_ip.is_expert_workshop_organized,
          readiness_level_evidence_based: result_ip.readiness_level_evidence_based,
          use_level_evidence_based: result_ip.use_level_evidence_based,
          last_updated_by: user.id
        }
      );

      await this._innovationByResultRepository.update(
        result_ip_core.result_by_innovation_package_id,
        {
          readiness_level_evidence_based: result_ip_core.readiness_level_evidence_based,
          readinees_evidence_link: result_ip_core.readinees_evidence_link,
          use_level_evidence_based: result_ip_core.use_level_evidence_based,
          use_evidence_link: result_ip_core.use_evidence_link,
          last_updated_by: user.id
        }
      )

      await this.saveInnovationUse(user, version, saveData);

      if(result_ip_complementary?.length){
        for (const ripc of result_ip_complementary) {
          this._innovationByResultRepository.update(
            ripc.result_by_innovation_package_id,
            {
              readiness_level_evidence_based: ripc.readiness_level_evidence_based,
              readinees_evidence_link: ripc.readinees_evidence_link,
              use_level_evidence_based: ripc.use_level_evidence_based,
              use_evidence_link: ripc.use_evidence_link,
              last_updated_by: user.id
            }
          )
        }
      }

      return {
        response: {},
        message: 'The Result Complementary Innovation have been saved successfully',
        status: HttpStatus.OK
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }

  }

  async getStepThree(resultId: number){
    try {
      const result_ip = await this._resultInnovationPackageRepository.findOne({where:{result_innovation_package_id: resultId, is_active: true}});
      if (!result_ip) {
        throw {
          response: resultId,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const result_core = await this._innovationByResultRepository.findOne({where: {ipsr_role_id: 1, result_innovation_package_id: result_ip.result_innovation_package_id, is_active: true}});
      const result_complementary = await this._innovationByResultRepository.find({where: {ipsr_role_id: 2, result_innovation_package_id: result_ip.result_innovation_package_id, is_active: true}, relations:{obj_result: true}});
      const returdata: SaveStepTwoThree = {
        innovatonUse: {
          actors: (await this._resultsIpActorRepository.find({where:{is_active: true, result_ip_result_id: result_core.result_by_innovation_package_id}})).map(el => ({ ...el, men_non_youth: el.men - el.men_youth, women_non_youth: el.women - el.women_youth })),
          measures: await this._resultsByIpInnovationUseMeasureRepository.find({where:{is_active: true, result_ip_result_id: result_core.result_by_innovation_package_id}}),
          organization: (await this._resultsIpInstitutionTypeRepository.find({ where: { result_ip_results_id: result_core.result_by_innovation_package_id, institution_roles_id: 6, is_active: true }, relations: { obj_institution_types: { obj_parent: { obj_parent: true } } } })).map(el => ({ ...el, parent_institution_type_id: el.obj_institution_types?.obj_parent?.obj_parent?.code || null }))
        },
        result_innovation_package: result_ip,
        result_ip_result_complementary: result_complementary,
        result_ip_result_core: result_core
      }
      return {
        response: returdata,
        message: 'Successful response',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
  
  private async saveInnovationUse(user: TokenDto, version: Version, { innovatonUse: crtr, result_ip_result_core: riprc }: SaveStepTwoThree) {
    if (crtr?.actors?.length) {
      const { actors } = crtr;
      actors.map(async (el: ResultsIpActor) => {
        let actorExists: ResultsIpActor = null;
        if (el?.actor_type_id) {
          actorExists = await this._resultsIpActorRepository.findOne({ where: { actor_type_id: el.actor_type_id, result_ip_result_id: riprc.result_by_innovation_package_id } });
        }else{
          actorExists = await this._resultsIpActorRepository.findOne({ where: { actor_type_id: IsNull(), result_ip_result_id: riprc.result_by_innovation_package_id } });
        }

        if (!actorExists && el?.result_ip_actors_id) {
          actorExists = await this._resultsIpActorRepository.findOne({ where: { result_ip_actors_id: el.result_ip_actors_id, result_ip_result_id: riprc.result_by_innovation_package_id } });
        }

        if (actorExists) {
          await this._resultsIpActorRepository.update(
            actorExists.result_ip_actors_id,
            {
              actor_type_id: el.actor_type_id,
              is_active: el.is_active == undefined?true:el.is_active,
              men: el.men,
              men_youth: el.men_youth,
              women: el.women,
              women_youth: el.women_youth,
              evidence_link: el.evidence_link,
              last_updated_by: user.id
            }
          );
        } else {
          await this._resultsIpActorRepository.save({
            actor_type_id: el.actor_type_id,
            is_active: el.is_active,
            men: el.men,
            men_youth: el.men_youth,
            women: el.women,
            women_youth: el.women_youth,
            last_updated_by: user.id,
            created_by: user.id,
            evidence_link: el.evidence_link,
            result_ip_result_id: riprc.result_by_innovation_package_id,
            version_id: version.id
          });
        }
      })
    }

    if (crtr?.organization.length) {
      const { organization } = crtr;
      organization.map(async (el) => {
        const ite = await this._resultsIpInstitutionTypeRepository.findOne({
          where: {
            result_ip_results_id: riprc.result_by_innovation_package_id,
            institution_types_id: el.institution_types_id,
            institution_roles_id: 6
          }
        });
        if (ite) {
          await this._resultsIpInstitutionTypeRepository.update(
            ite.id,
            {
              last_updated_by: user.id,
              how_many: el.how_many,
              is_active: el.is_active == undefined?true:el.is_active,
              evidence_link: el.evidence_link
            }
          );
        } else {
          await this._resultsIpInstitutionTypeRepository.save({
            result_ip_results_id: riprc.result_by_innovation_package_id,
            created_by: user.id,
            last_updated_by: user.id,
            institution_types_id: el.institution_types_id,
            institution_roles_id: 6,
            how_many: el.how_many,
            version_id: version.id,
            evidence_link: el.evidence_link
          })
        }
      })
    }

    if (crtr?.measures.length) {
      const { measures } = crtr;
      measures.map(async (el) => {
        let ripm: ResultsByIpInnovationUseMeasure = null;
        
        if(el?.unit_of_measure) {
          ripm = await this._resultsByIpInnovationUseMeasureRepository.findOne({
            where: {
              unit_of_measure: el.unit_of_measure,
              result_ip_result_id: riprc.result_by_innovation_package_id
            }
          });
        }
        
        if (!ripm && el?.result_ip_result_measures_id) {
          ripm = await this._resultsByIpInnovationUseMeasureRepository.findOne({
            where: {
              result_ip_result_measures_id: el.result_ip_result_measures_id
            }
          });
        } 
        
        if (ripm) {
          await this._resultsByIpInnovationUseMeasureRepository.update(
            ripm.result_ip_result_measures_id,
            {
              unit_of_measure: el.unit_of_measure,
              quantity: el.quantity,
              last_updated_by: user.id,
              evidence_link: el.evidence_link,
              is_active: el.is_active == undefined?true:el.is_active
            }
          )
        } else {
          await this._resultsByIpInnovationUseMeasureRepository.save({
            result_ip_result_id: riprc.result_by_innovation_package_id,
            unit_of_measure: el.unit_of_measure,
            quantity: el.quantity,
            created_by: user.id,
            last_updated_by: user.id,
            evidence_link: el.evidence_link,
            version_id: version.id
          })
        }
      });
    }
  }

}
