import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateInnovationDevDtoV2 } from './dto/create-innovation_dev.dto';
import { InnovationUseDto } from '../../results/summary/dto/create-innovation-use.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { InnoDevService } from '../../results/summary/innovation_dev.service';
import { ResultsInnovationsDev } from '../../results/summary/entities/results-innovations-dev.entity';
import { In, Repository } from 'typeorm';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultScalingStudyUrl } from '../result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { InnovationReadinessLevelByLevel } from './enum/innov-readiness-level.enum';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class InnovationDevService {
  constructor(
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _evidenceRepository: EvidencesRepository,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _innoDevService: InnoDevService,
    @InjectRepository(ResultScalingStudyUrl)
    private readonly _resultScalingStudyUrlsRepository: Repository<ResultScalingStudyUrl>,
  ) {}
  async saveInnovationDev(
    createInnovationDevDto: CreateInnovationDevDtoV2,
    innovationUseDto: InnovationUseDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const innDevExists =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );
      const {
        evidences_justification,
        innovation_characterization_id,
        innovation_collaborators,
        innovation_developers,
        innovation_nature_id,
        innovation_readiness_level_id,
        is_new_variety,
        number_of_varieties,
        readiness_level,
        result_innovation_dev_id,
        short_title,
        innovation_acknowledgement,
        innovation_pdf,
        innovation_user_to_be_determined,
        has_scaling_studies,
        scaling_studies_urls,
      } = createInnovationDevDto;

      let InnDevRes: ResultsInnovationsDev = undefined;
      if (innDevExists) {
        innDevExists.short_title = short_title;
        innDevExists.last_updated_by = user.id;
        innDevExists.is_new_variety = is_new_variety;
        innDevExists.readiness_level = readiness_level;
        innDevExists.number_of_varieties = number_of_varieties;
        innDevExists.innovation_nature_id = innovation_nature_id;
        innDevExists.innovation_developers = innovation_developers;
        innDevExists.evidences_justification = evidences_justification;
        innDevExists.innovation_collaborators = innovation_collaborators;
        innDevExists.result_innovation_dev_id = result_innovation_dev_id;
        innDevExists.innovation_readiness_level_id =
          innovation_readiness_level_id;
        innDevExists.innovation_characterization_id =
          innovation_characterization_id;
        innDevExists.innovation_acknowledgement = innovation_acknowledgement;
        innDevExists.innovation_pdf = innovation_pdf;
        innDevExists.innovation_user_to_be_determined =
          innovation_user_to_be_determined;
        innDevExists.has_scaling_studies = has_scaling_studies;
        InnDevRes = await this._resultsInnovationsDevRepository.save(
          innDevExists as any,
        );
      } else {
        const newInnDev = new ResultsInnovationsDev();
        newInnDev.created_by = user.id;
        newInnDev.results_id = resultId;
        newInnDev.last_updated_by = user.id;
        newInnDev.short_title = short_title;
        newInnDev.is_active = true;
        newInnDev.is_new_variety = is_new_variety;
        newInnDev.readiness_level = readiness_level;
        newInnDev.number_of_varieties = number_of_varieties;
        newInnDev.innovation_nature_id = innovation_nature_id;
        newInnDev.innovation_developers = innovation_developers;
        newInnDev.evidences_justification = evidences_justification;
        newInnDev.innovation_collaborators = innovation_collaborators;
        newInnDev.result_innovation_dev_id = result_innovation_dev_id;
        newInnDev.innovation_readiness_level_id = innovation_readiness_level_id;
        newInnDev.innovation_characterization_id =
          innovation_characterization_id;
        newInnDev.innovation_user_to_be_determined =
          innovation_user_to_be_determined;
        newInnDev.has_scaling_studies = has_scaling_studies;
        InnDevRes = await this._resultsInnovationsDevRepository.save(newInnDev);
      }

      // * SAVING INNOVATION AND SCALING
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.responsible_innovation_and_scaling.q1.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.responsible_innovation_and_scaling.q2.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.responsible_innovation_and_scaling.q3.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.responsible_innovation_and_scaling.q4.options,
      );

      // * SAVING INTELLECTUAL PROPERTY RIGHTS
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.intellectual_property_rights.q1.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.intellectual_property_rights.q2.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.intellectual_property_rights.q3.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.intellectual_property_rights.q4.options,
      );

      // * SAVING DIVERSITY AND MEGATRENDS
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.innovation_team_diversity.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.megatrends.options,
      );

      // * Save Evidence
      await this._innoDevService.saveEvidence(
        resultId,
        user.id,
        createInnovationDevDto.reference_materials,
        4,
      );

      // * Save Investment
      await this._innoDevService.saveInitiativeInvestment(
        resultId,
        user.id,
        createInnovationDevDto,
      );
      await this._innoDevService.saveBillateralInvestment(
        resultId,
        user.id,
        createInnovationDevDto,
      );
      await this._innoDevService.savePartnerInvestment(
        user.id,
        createInnovationDevDto,
      );

      if (
        innovation_readiness_level_id >=
          InnovationReadinessLevelByLevel.Level_6 &&
        has_scaling_studies &&
        scaling_studies_urls?.length
      ) {
        await this._resultScalingStudyUrlsRepository.update(
          { result_innov_dev_id: InnDevRes.result_innovation_dev_id },
          { is_active: false },
        );

        const urlsToSave = scaling_studies_urls.map((url) => ({
          result_innov_dev_id: InnDevRes.result_innovation_dev_id,
          study_url: url,
          is_active: true,
          created_by: user.id,
        }));

        await this._resultScalingStudyUrlsRepository.save(urlsToSave);
      }

      if (
        innovation_user_to_be_determined != false ||
        innovation_user_to_be_determined != null
      ) {
        // * Save InnovationUser
        await this._innoDevService.saveAnticipatedInnoUser(
          resultId,
          user.id,
          innovationUseDto,
        );
      }

      return {
        response: InnDevRes,
        message: 'Results Innovations Dev has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getInnovationDev(resultId: number) {
    try {
      const innDevExists =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );

      const pictures = await this._evidenceRepository.find({
        where: { result_id: resultId, evidence_type_id: 3, is_active: 1 },
      });
      const reference_materials = await this._evidenceRepository.find({
        where: { result_id: resultId, evidence_type_id: 4, is_active: 1 },
      });
      const result = await this._resultRepository.getResultById(resultId);

      const actorsData = await this._resultActorRepository.find({
        where: { result_id: resultId, is_active: true },
        relations: { obj_actor_type: true },
      });
      const innovatonUse = {
        actors: actorsData,
        measures: await this._resultIpMeasureRepository.find({
          where: { result_id: resultId, is_active: true },
        }),
        organization: (
          await this._resultByIntitutionsTypeRepository.find({
            where: {
              results_id: resultId,
              institution_roles_id: 5,
              is_active: true,
            },
            relations: {
              obj_institution_types: { obj_parent: { obj_parent: true } },
            },
          })
        ).map((el) => ({
          ...el,
          parent_institution_type_id: el.obj_institution_types?.obj_parent
            ?.obj_parent?.code
            ? el.obj_institution_types?.obj_parent?.obj_parent?.code
            : el.obj_institution_types?.obj_parent?.code || null,
        })),
      };

      const initiatives = await this._resultByInitiativeRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
        },
      });

      const initiative_expected_investment =
        await this._resultInitiativesBudgetRepository.find({
          where: {
            result_initiative_id: In(initiatives.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_initiative: {
              obj_initiative: true,
            },
          },
        });

      const npp = await this._nonPooledProjectRepository.find({
        where: {
          results_id: resultId,
          is_active: true,
          non_pooled_project_type_id: 1,
        },
      });

      const bilateral_expected_investment =
        await this._resultBilateralBudgetRepository.find({
          where: {
            non_pooled_projetct_id: In(npp.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_non_pooled_projetct: {
              obj_funder_institution_id: true,
            },
          },
        });

      const institutions: ResultsByInstitution[] =
        await this._resultByIntitutionsRepository.find({
          where: { result_id: resultId, is_active: true },
        });
      const institutions_expected_investment =
        await this._resultInstitutionsBudgetRepository.find({
          where: {
            result_institution_id: In(institutions.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_institution: {
              obj_institutions: {
                obj_institution_type_code: true,
              },
            },
          },
        });

      let scaling_studies_urls: string[] = [];
      if (
        innDevExists.innovation_readiness_level_id >=
        InnovationReadinessLevelByLevel.Level_6
      ) {
        const urls = await this._resultScalingStudyUrlsRepository.find({
          where: {
            result_innov_dev_id: innDevExists.result_innovation_dev_id,
            is_active: true,
          },
        });
        scaling_studies_urls = urls.map((u) => u.study_url);
      }

      return {
        response: {
          ...innDevExists,
          pictures,
          innovatonUse,
          initiative_expected_investment,
          bilateral_expected_investment,
          institutions_expected_investment,
          scaling_studies_urls,
          reference_materials,
          result,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
