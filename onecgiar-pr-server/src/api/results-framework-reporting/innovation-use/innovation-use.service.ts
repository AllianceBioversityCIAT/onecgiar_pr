import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateInnovationUseDto } from './dto/create-innovation-use.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { LinkedResultsService } from '../../results/linked-results/linked-results.service';
import { ResultActor } from '../../results/result-actors/entities/result-actor.entity';
import { In, IsNull, Repository } from 'typeorm';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultsByInstitutionType } from '../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasure } from '../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';
import { ResultsInnovationsUse } from '../../results/summary/entities/results-innovations-use.entity';
import { ResultScalingStudyUrl } from '../result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ResultCoreInnovUseSectionEnum } from '../result_innov_section/enum/result_innov_section.enum';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultInitiativeBudget } from '../../results/result_budget/entities/result_initiative_budget.entity';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudget } from '../../results/result_budget/entities/result_institutions_budget.entity';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultRepository } from '../../results/result.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';

@Injectable()
export class InnovationUseService {
  private readonly logger = new Logger(InnovationUseService.name);
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _linkedResultService: LinkedResultsService,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
    @InjectRepository(ResultScalingStudyUrl)
    private readonly _resultScalingStudyUrlsRepository: Repository<ResultScalingStudyUrl>,
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultByProjectRepository: ResultsByProjectsRepository,
  ) {}

  async saveInnovationUse(
    innovationUseDto: CreateInnovationUseDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      if (!resultId) {
        this.logger.error('Missing resultId in saveInnovationUse');
        throw {
          response: {},
          message: 'Missing data in the request',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const resultExist =
        await this._resultsInnovationsUseRepository.InnovUseExists(resultId);

      const {
        has_innovation_link,
        innovation_readiness_level_id,
        linked_results,
        readiness_level_explanation,
        has_scaling_studies,
        scaling_studies_urls,
        innov_use_2030_to_be_determined,
        innov_use_to_be_determined,
      } = innovationUseDto;

      let InnUseRes: ResultsInnovationsUse;
      if (resultExist) {
        resultExist.has_innovation_link = has_innovation_link;
        resultExist.innovation_readiness_level_id =
          innovation_readiness_level_id;
        resultExist.last_updated_by = user.id;
        resultExist.innov_use_to_be_determined = innov_use_to_be_determined;
        resultExist.innov_use_2030_to_be_determined =
          innov_use_2030_to_be_determined;

        if (innovation_readiness_level_id >= 6) {
          resultExist.readiness_level_explanation =
            readiness_level_explanation ?? null;
          resultExist.has_scaling_studies = !!has_scaling_studies;

          if (!has_scaling_studies) {
            await this._resultScalingStudyUrlsRepository.update(
              { result_innov_use_id: resultExist.result_innovation_use_id },
              { is_active: false },
            );
          }
        } else {
          resultExist.readiness_level_explanation = null;
          resultExist.has_scaling_studies = false;

          await this._resultScalingStudyUrlsRepository.update(
            { result_innov_use_id: resultExist.result_innovation_use_id },
            { is_active: false },
          );
        }

        InnUseRes =
          await this._resultsInnovationsUseRepository.save(resultExist);
      } else {
        const newInnUse = new ResultsInnovationsUse();
        newInnUse.created_by = user.id;
        newInnUse.results_id = resultId;
        newInnUse.last_updated_by = user.id;
        newInnUse.is_active = true;
        newInnUse.innovation_readiness_level_id = innovation_readiness_level_id;
        newInnUse.has_innovation_link = has_innovation_link;
        newInnUse.innov_use_to_be_determined = innov_use_to_be_determined;
        newInnUse.innov_use_2030_to_be_determined =
          innov_use_2030_to_be_determined;

        if (innovation_readiness_level_id >= 6) {
          newInnUse.readiness_level_explanation =
            readiness_level_explanation ?? null;
          newInnUse.has_scaling_studies = !!has_scaling_studies;

          if (!has_scaling_studies) {
            await this._resultScalingStudyUrlsRepository.update(
              { result_innov_use_id: newInnUse.result_innovation_use_id },
              { is_active: false },
            );
          }
        }

        InnUseRes = await this._resultsInnovationsUseRepository.save(newInnUse);
      }

      if (
        innovation_readiness_level_id >= 6 &&
        has_scaling_studies &&
        scaling_studies_urls?.length
      ) {
        await this._resultScalingStudyUrlsRepository.update(
          { result_innov_use_id: InnUseRes.result_innovation_use_id },
          { is_active: false },
        );

        const urlsToSave = scaling_studies_urls.map((url) => ({
          result_innov_use_id: InnUseRes.result_innovation_use_id,
          study_url: url,
          is_active: true,
          created_by: user.id,
        }));

        await this._resultScalingStudyUrlsRepository.save(urlsToSave);
      }

      const innovation_use = {
        actors: innovationUseDto.actors ?? [],
        organization: innovationUseDto.organization ?? [],
        measures: innovationUseDto.measures ?? [],
      };

      await this.saveAnticipatedInnoUser(
        InnUseRes.results_id,
        user.id,
        {
          ...innovationUseDto,
          innovation_use: innovation_use,
        },
        ResultCoreInnovUseSectionEnum.CURRENT,
        innov_use_to_be_determined,
      );

      await this.saveAnticipatedInnoUser(
        InnUseRes.results_id,
        user.id,
        {
          ...innovationUseDto,
          innovation_use: innovationUseDto.innovation_use_2030,
        },
        ResultCoreInnovUseSectionEnum.FUTURE,
        innov_use_2030_to_be_determined,
      );

      const result_version = await this._resultRepository.findOne({
        where: { id: resultId },
        select: ['version_id'],
      });

      await this.saveInitiativeInvestment(resultId, user.id, innovationUseDto);
      await this.saveBillateralInvestment(
        resultId,
        result_version.version_id,
        user.id,
        innovationUseDto,
      );
      await this.savePartnerInvestment(resultId, user.id, innovationUseDto);

      if (!has_innovation_link) {
        await this._linkedResultService.createForInnovationUse(
          InnUseRes.results_id,
          [],
          user,
        );
      } else {
        await this._linkedResultService.createForInnovationUse(
          InnUseRes.results_id,
          linked_results,
          user,
        );
      }
      return {
        response: InnUseRes,
        message: 'Results Innovations Use has been saved successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      this.logger.error('Error in saveInnovationUse', error.stack || error);
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async saveAnticipatedInnoUser(
    resultId: number,
    user: number,
    crtr: CreateInnovationUseDto,
    section: ResultCoreInnovUseSectionEnum = null,
    determined?: boolean | null,
  ) {
    if (determined === true) {
      await this._resultActorRepository.update(
        { result_id: resultId, is_active: true },
        { is_active: false, last_updated_by: user },
      );
      await this._resultByIntitutionsTypeRepository.update(
        { results_id: resultId, is_active: true },
        { is_active: false, last_updated_by: user },
      );
      await this._resultIpMeasureRepository.update(
        { result_id: resultId, is_active: true },
        { is_active: false, last_updated_by: user },
      );

      return;
    }

    // Actors
    if (crtr?.innovation_use?.actors?.length) {
      for (const el of crtr.innovation_use.actors) {
        let actorExists: ResultActor = null;
        if (el?.actor_type_id) {
          const whereOptions: any = {
            actor_type_id: el.actor_type_id,
            result_id: resultId,
            result_actors_id: el.result_actors_id ?? IsNull(),
            is_active: true,
          };
          if (!el?.result_actors_id && `${el.actor_type_id}` === '5') {
            whereOptions.other_actor_type = el?.other_actor_type || IsNull();
          } else if (el?.result_actors_id) {
            delete whereOptions.actor_type_id;
          }
          actorExists = await this._resultActorRepository.findOne({
            where: whereOptions,
          });
        } else if (el?.result_actors_id) {
          actorExists = await this._resultActorRepository.findOne({
            where: {
              result_actors_id: el.result_actors_id,
              result_id: resultId,
            },
          });
        } else {
          actorExists = await this._resultActorRepository.findOne({
            where: { actor_type_id: IsNull(), result_id: resultId },
          });
        }

        this.validateRequired(
          el?.actor_type_id,
          'The field actor type is required',
        );

        if (actorExists) {
          await this._resultActorRepository.update(
            actorExists.result_actors_id,
            this.buildActorData(el, user, resultId, section),
          );
        } else {
          await this._resultActorRepository.save(
            this.buildActorData(el, user, resultId, section),
          );
        }
      }
    }

    // Organizations
    if (crtr?.innovation_use?.organization?.length) {
      for (const el of crtr.innovation_use.organization) {
        let ite: ResultsByInstitutionType = null;
        if (el?.institution_types_id && el?.institution_types_id != 78) {
          ite =
            await this._resultByIntitutionsTypeRepository.getNewResultByInstitutionTypeExists(
              resultId,
              el.institution_types_id,
              5,
            );
        }
        if (!ite && el?.id) {
          ite =
            await this._resultByIntitutionsTypeRepository.getNewResultByIdExists(
              resultId,
              el.id,
              5,
            );
        }

        this.validateRequired(
          el?.institution_types_id,
          'The field institution type is required',
        );

        if (ite) {
          await this._resultByIntitutionsTypeRepository.update(
            ite.id,
            this.buildInstitutionData(el, user, resultId, section),
          );
        } else {
          await this._resultByIntitutionsTypeRepository.save(
            this.buildInstitutionData(el, user, resultId, section),
          );
        }
      }
    }

    // Measures
    if (crtr?.innovation_use?.measures?.length) {
      for (const el of crtr.innovation_use.measures) {
        let ripm: ResultIpMeasure = null;
        if (el?.result_ip_measure_id) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: { result_ip_measure_id: el.result_ip_measure_id },
          });
        } else if (el?.unit_of_measure) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: el.unit_of_measure,
              result_id: resultId,
              quantity: el?.quantity,
            },
          });
        } else {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: IsNull(),
              result_id: resultId,
              quantity: el?.quantity,
            },
          });
        }

        this.validateRequired(
          el?.unit_of_measure,
          'The field Unit of Measure is required',
        );

        if (ripm) {
          await this._resultIpMeasureRepository.update(
            ripm.result_ip_measure_id,
            this.buildMeasureData(el, user, resultId, section),
          );
        } else {
          await this._resultIpMeasureRepository.save(
            this.buildMeasureData(el, user, resultId, section),
          );
        }
      }
    }
  }

  isNullData(data: any) {
    return data == undefined ? null : data;
  }

  private validateRequired(field: any, message: string) {
    if (!field) {
      throw {
        response: { status: 'Error' },
        message,
        status: HttpStatus.BAD_REQUEST,
      };
    }
  }

  private buildActorData(el, user, resultId, section) {
    return {
      actor_type_id: this.isNullData(el?.actor_type_id),
      is_active: el?.is_active ?? true,
      has_men: this.isNullData(el?.has_men),
      has_men_youth: this.isNullData(el?.has_men_youth),
      has_women: this.isNullData(el?.has_women),
      has_women_youth: this.isNullData(el?.has_women_youth),
      men: this.isNullData(el?.men),
      men_youth: this.isNullData(el?.men_youth),
      women: this.isNullData(el?.women),
      women_youth: this.isNullData(el?.women_youth),
      other_actor_type: this.isNullData(el?.other_actor_type),
      section_id: this.isNullData(section),
      last_updated_by: user,
      created_by: user,
      result_id: resultId,
      sex_and_age_disaggregation: el?.sex_and_age_disaggregation === true,
      how_many: el?.how_many,
      addressing_demands: this.isNullData(el?.addressing_demands),
    };
  }

  private buildInstitutionData(el, user, resultId, section) {
    return {
      results_id: resultId,
      created_by: user,
      last_updated_by: user,
      other_institution: this.isNullData(el?.other_institution),
      institution_types_id: this.isNullData(el.institution_types_id),
      graduate_students: this.isNullData(el?.graduate_students),
      institution_roles_id: 5,
      how_many: el?.how_many,
      addressing_demands: this.isNullData(el?.addressing_demands),
      section_id: this.isNullData(section),
      is_active: el?.is_active,
    };
  }

  private buildMeasureData(el, user, resultId, section) {
    return {
      result_id: resultId,
      quantity: this.isNullData(el?.quantity),
      unit_of_measure: this.isNullData(el?.unit_of_measure),
      created_by: user,
      last_updated_by: user,
      addressing_demands: this.isNullData(el?.addressing_demands),
      section_id: this.isNullData(section),
      is_active: el.is_active ?? true,
    };
  }

  async getInnovationUse(resultId: number) {
    try {
      const innDevExists =
        await this._resultsInnovationsUseRepository.InnovUseExists(resultId);

      if (!innDevExists) {
        throw {
          response: {},
          message: `Innovation Use not found for result ${resultId}`,
          status: HttpStatus.NOT_FOUND,
        };
      }
      const linked_results: number[] =
        await this._resultsInnovationsUseRepository.getLinkedResultsByOrigin(
          resultId,
        );

      // Actors
      const actorsData = await this._resultActorRepository.find({
        where: { result_id: resultId, is_active: true },
        relations: { obj_actor_type: true },
      });
      actorsData.map((el) => {
        el['men_non_youth'] = el.men - el.men_youth;
        el['women_non_youth'] = el.women - el.women_youth;
      });

      // Measures
      const measures = await this._resultIpMeasureRepository.find({
        where: { result_id: resultId, is_active: true },
      });

      // Organizations
      const organization = (
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
        parent_institution_type_id:
          el.obj_institution_types?.obj_parent?.obj_parent?.code ??
          el.obj_institution_types?.obj_parent?.code ??
          null,
      }));

      const actors_current = actorsData.filter(
        (a) => Number(a.section_id) === 1,
      );
      const organizations_current = organization.filter(
        (o) => Number(o.section_id) === 1,
      );
      const measures_current = measures.filter(
        (m) => Number(m.section_id) === 1,
      );

      const innovation_use_2030 = {
        actors: actorsData.filter((a) => Number(a.section_id) === 2),
        organization: organization.filter((o) => Number(o.section_id) === 2),
        measures: measures.filter((m) => Number(m.section_id) === 2),
      };

      let scaling_studies_urls: string[] = [];
      if (innDevExists.innovation_readiness_level_id >= 6) {
        const urls = await this._resultScalingStudyUrlsRepository.find({
          where: {
            result_innov_use_id: innDevExists.result_innovation_use_id,
            is_active: true,
          },
        });
        scaling_studies_urls = urls.map((u) => u.study_url);
      }

      const initiatives = await this._resultByInitiativeRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
        },
      });

      const investment_programs_raw =
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

      const investment_programs = investment_programs_raw.map((item) => ({
        id: item.obj_result_initiative?.obj_initiative?.id ?? null,
        kind_cash:
          item.kind_cash !== null && item.kind_cash !== undefined
            ? Number(item.kind_cash)
            : null,
        is_determined: item.is_determined ?? null,
        official_code:
          item.obj_result_initiative?.obj_initiative?.official_code ?? null,
        name: item.obj_result_initiative?.obj_initiative?.name ?? null,
      }));

      const rversion = await this._resultRepository.findOne({
        where: { id: resultId },
        select: ['version_id'],
      });

      let investment_bilateral_raw: any;
      if (rversion?.version_id === 34) {
        const rbp = await this._resultByProjectRepository.find({
          where: {
            result_id: resultId,
            is_active: true,
          },
        });

        investment_bilateral_raw =
          await this._resultBilateralBudgetRepository.find({
            where: {
              result_project_id: In(rbp.map((el) => el.id)),
              is_active: true,
            },
            relations: {
              obj_result_project: {
                obj_clarisa_project: true,
              },
            },
          });
      } else {
        const npp = await this._nonPooledProjectRepository.find({
          where: {
            results_id: resultId,
            is_active: true,
            non_pooled_project_type_id: 1,
          },
        });

        investment_bilateral_raw =
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
      }

      const investment_bilateral = investment_bilateral_raw.map((item) => {
        const funder =
          rversion?.version_id === 34
            ? item.obj_result_project?.clarisaProject
            : item.obj_non_pooled_projetct?.obj_funder_institution_id;

        const name =
          rversion?.version_id === 34
            ? (item.obj_result_project?.clarisaProject?.short_name ?? null)
            : (item.obj_non_pooled_projetct?.grant_title ?? null);

        return {
          id: funder?.id ?? null,
          kind_cash:
            item.kind_cash !== null && item.kind_cash !== undefined
              ? Number(item.kind_cash)
              : null,
          is_determined: item.is_determined ?? null,
          official_code: null,
          name,
        };
      });

      const institutions: ResultsByInstitution[] =
        await this._resultByIntitutionsRepository.find({
          where: { result_id: resultId, is_active: true },
        });
      const investment_partners_raw =
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

      const investment_partners = investment_partners_raw.map((item) => ({
        id: item.obj_result_institution?.obj_institutions?.id ?? null,
        kind_cash:
          item.kind_cash !== null && item.kind_cash !== undefined
            ? Number(item.kind_cash)
            : null,
        is_determined: item.is_determined ?? null,
        official_code:
          item.obj_result_institution?.obj_institutions?.acronym ?? null,
        name: item.obj_result_institution?.obj_institutions?.name ?? null,
      }));

      const innovationUse = {
        ...innDevExists,
        linked_results,
        actors: actors_current,
        organization: organizations_current,
        measures: measures_current,
        innovation_use_2030,
        investment_programs,
        investment_partners,
        investment_bilateral,
        readiness_level_explanation:
          innDevExists.readiness_level_explanation ?? null,
        has_scaling_studies: innDevExists.has_scaling_studies ?? false,
        scaling_studies_urls,
      };

      return {
        response: innovationUse,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async saveInitiativeInvestment(
    resultId: number,
    user: number,
    { investment_programs: inv }: CreateInnovationUseDto,
  ) {
    try {
      if (!inv || !Array.isArray(inv) || inv.length === 0) {
        this.logger.log(
          `[saveInitiativeInvestment] No investment_programs provided for resultId: ${resultId}. Continuing flow.`,
        );
        return { valid: true };
      }

      for (const initiative of inv) {
        const ibr = await this._resultByInitiativeRepository.findOne({
          where: {
            result_id: resultId,
            initiative_id: initiative.id,
            is_active: true,
          },
        });

        if (!ibr) {
          this.logger.error(
            `[saveInitiativeInvestment] Initiative relation not found for resultId: ${resultId}, initiativeId: ${initiative.id}`,
          );
          throw {
            response: {},
            message: `Initiative relation not found for resultId: ${resultId}, initiativeId: ${initiative.id}`,
            status: HttpStatus.NOT_FOUND,
          };
        }

        const rie: ResultInitiativeBudget =
          await this._resultInitiativesBudgetRepository.findOne({
            where: {
              result_initiative_id: ibr.id,
              is_active: true,
            },
          });

        if (rie) {
          rie.kind_cash =
            initiative.is_determined === true
              ? null
              : initiative.kind_cash === null
                ? null
                : Number(initiative.kind_cash);

          rie.is_determined = initiative.is_determined;
          rie.last_updated_by = user;

          await this._resultInitiativesBudgetRepository.save(rie);
        } else {
          const newRie = this._resultInitiativesBudgetRepository.create({
            result_initiative_id: ibr.id,
            kind_cash:
              initiative.is_determined === true
                ? null
                : initiative.kind_cash === null
                  ? null
                  : Number(initiative.kind_cash),
            is_determined: initiative.is_determined,
            created_by: user,
            last_updated_by: user,
          });

          await this._resultInitiativesBudgetRepository.save(newRie);
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveBillateralInvestment(
    resultId: number,
    result_version: number,
    user: number,
    { investment_bilateral: inv }: CreateInnovationUseDto,
  ) {
    try {
      if (!inv || !Array.isArray(inv) || inv.length === 0) {
        this.logger.log(
          `[saveBillateralInvestment] No investment_bilateral provided for resultId: ${resultId}. Continuing flow.`,
        );
        return { valid: true };
      }

      for (const i of inv) {
        if (result_version === 34) {
          // ========  result_version Reporting P25 ========
          const rbp = await this._resultByProjectRepository.findOne({
            where: {
              result_id: resultId,
              is_active: true,
              project_id: i.id,
            },
          });

          if (!rbp) {
            this.logger.error(
              `[saveBillateralInvestment] ResultByProject not found for resultId: ${resultId}, project_id: ${i.id}`,
            );
            throw {
              response: {},
              message: `ResultByProject not found for resultId: ${resultId}, project_id: ${i.id}`,
              status: HttpStatus.NOT_FOUND,
            };
          }

          const rbb = await this._resultBilateralBudgetRepository.findOne({
            where: {
              result_project_id: rbp.id,
              is_active: true,
            },
          });

          if (rbb) {
            rbb.kind_cash =
              i.is_determined === true
                ? null
                : i.kind_cash === null
                  ? null
                  : Number(i.kind_cash);
            rbb.is_determined = i.is_determined;
            rbb.last_updated_by = user;
            rbb.non_pooled_projetct_id = null;

            await this._resultBilateralBudgetRepository.save(rbb);
          } else {
            const newRbb = this._resultBilateralBudgetRepository.create({
              result_project_id: rbp.id,
              non_pooled_projetct_id: null,
              kind_cash:
                i.is_determined === true
                  ? null
                  : i.kind_cash === null
                    ? null
                    : Number(i.kind_cash),
              is_determined: i.is_determined,
              created_by: user,
              last_updated_by: user,
            });

            await this._resultBilateralBudgetRepository.save(newRbb);
          }
        } else {
          const npp = await this._nonPooledProjectRepository.findOne({
            where: {
              results_id: resultId,
              is_active: true,
              funder_institution_id: i.id,
            },
          });

          if (!npp) {
            this.logger.error(
              `[saveBillateralInvestment] Non-pooled project not found for resultId: ${resultId}, id: ${i.id}`,
            );
            throw {
              response: {},
              message: `Non-pooled project not found for resultId: ${resultId}, id: ${i.id}`,
              status: HttpStatus.NOT_FOUND,
            };
          }

          const rbb = await this._resultBilateralBudgetRepository.findOne({
            where: {
              non_pooled_projetct_id: npp.id,
              is_active: true,
            },
          });

          if (rbb) {
            rbb.kind_cash =
              i.is_determined === true
                ? null
                : i.kind_cash === null
                  ? null
                  : Number(i.kind_cash);
            rbb.is_determined = i.is_determined;
            rbb.result_project_id = null;
            rbb.last_updated_by = user;

            await this._resultBilateralBudgetRepository.save(rbb);
          } else {
            const newRbb = this._resultBilateralBudgetRepository.create({
              non_pooled_projetct_id: npp.id,
              result_project_id: null,
              kind_cash:
                i.is_determined === true
                  ? null
                  : i.kind_cash === null
                    ? null
                    : Number(i.kind_cash),
              is_determined: i.is_determined,
              created_by: user,
              last_updated_by: user,
            });

            await this._resultBilateralBudgetRepository.save(newRbb);
          }
        }
      }
      return { valid: true };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async savePartnerInvestment(
    resultId: number,
    user: number,
    { investment_partners: inv }: CreateInnovationUseDto,
  ) {
    try {
      if (!inv || !Array.isArray(inv) || inv.length === 0) {
        this.logger.log(
          '[savePartnerInvestment] No investment_partners provided. Continuing flow.',
        );
        return { valid: true };
      }

      for (const partner of inv) {
        const rbi = await this._resultByIntitutionsRepository.findOne({
          where: {
            result_id: resultId,
            institutions_id: partner.id,
          },
        });

        if (!rbi) {
          this.logger.error(
            `[savePartnerInvestment] Institution relation not found for resultId: ${resultId}, institutionId: ${partner.id}`,
          );
          throw {
            response: {},
            message: `Partner relation not found for resultId: ${resultId}, partnerId: ${partner.id}`,
            status: HttpStatus.NOT_FOUND,
          };
        }

        const existBud: ResultInstitutionsBudget =
          await this._resultInstitutionsBudgetRepository.findOne({
            where: {
              result_institution_id: rbi.id,
              is_active: true,
            },
          });

        if (existBud) {
          existBud.kind_cash =
            partner.kind_cash === null ? null : Number(partner.kind_cash);
          existBud.is_determined = partner.is_determined;
          existBud.last_updated_by = user;

          await this._resultInstitutionsBudgetRepository.save(existBud);
        } else {
          const newBud = this._resultInstitutionsBudgetRepository.create({
            result_institution_id: rbi.id,
            kind_cash:
              partner.kind_cash === null ? null : Number(partner.kind_cash),
            is_determined: partner.is_determined,
            created_by: user,
            last_updated_by: user,
          });

          await this._resultInstitutionsBudgetRepository.save(newBud);
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
