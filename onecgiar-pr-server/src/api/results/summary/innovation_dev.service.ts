import { Injectable, HttpStatus } from '@nestjs/common';
import { InnovationUseDto } from './dto/create-innovation-use.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import {
  CreateInnovationDevDto,
  Option,
  SubOption,
} from './dto/create-innovation-dev.dto';
import { ResultActor } from '../result-actors/entities/result-actor.entity';
import { IsNull } from 'typeorm';
import { ResultActorRepository } from '../result-actors/repositories/result-actors.repository';
import { ResultsByInstitutionType } from '../results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultByIntitutionsTypeRepository } from '../results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasure } from '../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultInitiativeBudget } from '../result_budget/entities/result_initiative_budget.entity';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultInstitutionsBudget } from '../result_budget/entities/result_institutions_budget.entity';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { Evidence } from '../evidences/entities/evidence.entity';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { ResultAnswerRepository } from '../result-questions/repository/result-answers.repository';
import { ResultAnswer } from '../result-questions/entities/result-answers.entity';

@Injectable()
export class InnoDevService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _evidenceRepository: EvidencesRepository,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
  ) {}

  async saveOptionsAndSubOptions(
    resultId: number,
    user: number,
    options: Option[],
  ) {
    const saveAnswer = async (data: Option | SubOption) => {
      if (data.answer_boolean == null && data.answer_text == null) {
        return; // Skip if no valid answer
      }

      const existingAnswer = await this._resultAnswerRepository.findOne({
        where: {
          result_id: resultId,
          result_question_id: data.result_question_id,
        },
      });

      if (existingAnswer) {
        existingAnswer.answer_boolean = data.answer_boolean;
        existingAnswer.answer_text = data.answer_text;
        existingAnswer.last_updated_by = user;
        await this._resultAnswerRepository.save(existingAnswer);
      } else {
        const newAnswer = new ResultAnswer();
        newAnswer.result_question_id = data.result_question_id;
        newAnswer.answer_boolean = data.answer_boolean;
        newAnswer.answer_text = data.answer_text;
        newAnswer.result_id = resultId;
        newAnswer.created_by = user;
        newAnswer.last_updated_by = user;

        await this._resultAnswerRepository.save(newAnswer);
      }
    };

    for (const optionData of options) {
      await saveAnswer(optionData); // Save main option

      // Save sub-options
      for (const subOptionData of optionData.subOptions ?? []) {
        await saveAnswer(subOptionData);
      }
    }
  }

  async saveEvidence(
    resultId: number,
    user: number,
    evidences: Evidence[],
    evidence_type_id: number,
  ) {
    const existingEvidences = await this._evidenceRepository.find({
      where: {
        result_id: resultId,
        evidence_type_id: evidence_type_id,
      },
    });

    for (const existingEvidence of existingEvidences) {
      const matchingEvidence = evidences.find(
        (evidence) => evidence.link === existingEvidence.link,
      );

      if (matchingEvidence) {
        existingEvidence.link = matchingEvidence.link;
        existingEvidence.last_updated_by = user;
        existingEvidence.is_active = 1;
        await this._evidenceRepository.save(existingEvidence);
      } else {
        existingEvidence.is_active = 0;
        existingEvidence.last_updated_by = user;
        await this._evidenceRepository.save(existingEvidence);
      }
    }

    for (const evidence of evidences) {
      const evidenceExist = await this._evidenceRepository.findOne({
        where: {
          result_id: resultId,
          evidence_type_id: evidence_type_id,
          link: evidence.link,
        },
      });

      if (evidenceExist) {
        evidenceExist.link = evidence.link;
        evidenceExist.last_updated_by = user;
        await this._evidenceRepository.save(evidenceExist);
      } else {
        const newEvidence = new Evidence();
        newEvidence.result_id = resultId;
        newEvidence.evidence_type_id = evidence_type_id;
        newEvidence.link = evidence.link;
        newEvidence.created_by = user;
        newEvidence.last_updated_by = user;

        await this._evidenceRepository.save(newEvidence);
      }
    }
  }

  async saveAnticipatedInnoUser(
    resultId: number,
    user: number,
    { innovatonUse: crtr }: InnovationUseDto,
  ) {
    if (crtr?.actors?.length) {
      const { actors } = crtr;
      for (const el of actors) {
        let actorExists: ResultActor = null;

        if (el?.actor_type_id) {
          const { actor_type_id } = el;
          const whereOptions: any = {
            actor_type_id: el.actor_type_id,
            result_id: resultId,
            result_actors_id: el.result_actors_id ?? IsNull(),
            is_active: true,
          };

          if (!el?.result_actors_id) {
            switch (`${actor_type_id}`) {
              case '5':
                whereOptions.other_actor_type =
                  el?.other_actor_type || IsNull();
                break;
            }
          } else {
            delete whereOptions.actor_type_id;
          }
          actorExists = await this._resultActorRepository.findOne({
            where: whereOptions,
          });
        } else if (!actorExists && el?.result_actors_id) {
          actorExists = await this._resultActorRepository.findOne({
            where: {
              result_actors_id: el.result_actors_id,
              result_id: resultId,
            },
          });
        } else if (!actorExists) {
          actorExists = await this._resultActorRepository.findOne({
            where: { actor_type_id: IsNull(), result_id: resultId },
          });
        }

        if (actorExists) {
          if (!el?.actor_type_id && el?.is_active !== false) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultActorRepository.update(
            actorExists.result_actors_id,
            {
              actor_type_id: this.isNullData(el?.actor_type_id),
              is_active: el.is_active == undefined ? true : el.is_active,
              has_men: this.isNullData(el?.has_men),
              has_men_youth: this.isNullData(el?.has_men_youth),
              has_women: this.isNullData(el?.has_women),
              has_women_youth: this.isNullData(el?.has_women_youth),
              men: this.isNullData(el?.men),
              men_youth: this.isNullData(el?.men_youth),
              women: this.isNullData(el?.women),
              women_youth: this.isNullData(el?.women_youth),
              last_updated_by: user,
              other_actor_type: this.isNullData(el?.other_actor_type),
              sex_and_age_disaggregation:
                el?.sex_and_age_disaggregation === true ? true : false,
              how_many: el?.how_many,
              addressing_demands: this.isNullData(el?.addressing_demands),
            },
          );
        } else {
          if (!el?.actor_type_id) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultActorRepository.save({
            actor_type_id: this.isNullData(el?.actor_type_id),
            is_active: el?.is_active,
            has_men: this.isNullData(el?.has_men),
            has_men_youth: this.isNullData(el?.has_men_youth),
            has_women: this.isNullData(el?.has_women),
            has_women_youth: this.isNullData(el?.has_women_youth),
            men: this.isNullData(el?.men),
            men_youth: this.isNullData(el?.men_youth),
            women: this.isNullData(el?.women),
            women_youth: this.isNullData(el?.women_youth),
            other_actor_type: this.isNullData(el?.other_actor_type),
            last_updated_by: user,
            created_by: user,
            result_id: resultId,
            sex_and_age_disaggregation:
              el?.sex_and_age_disaggregation === true ? true : false,
            how_many: el?.how_many,
            addressing_demands: this.isNullData(el?.addressing_demands),
          });
        }
      }
    }

    if (crtr?.organization?.length) {
      const { organization } = crtr;
      for (const el of organization) {
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

        if (ite) {
          if (!el?.institution_types_id && el?.is_active !== false) {
            return {
              response: { status: 'Error' },
              message: 'The field institution type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          } else {
            await this._resultByIntitutionsTypeRepository.update(ite.id, {
              institution_types_id: this.isNullData(el?.institution_types_id),
              last_updated_by: user,
              other_institution: this.isNullData(el?.other_institution),
              how_many: this.isNullData(el?.how_many),
              is_active: el?.is_active,
              graduate_students: this.isNullData(el?.graduate_students),
              addressing_demands: this.isNullData(el?.addressing_demands),
            });
          }
        } else {
          if (!el?.institution_types_id) {
            return {
              response: { status: 'Error' },
              message: 'The field institution type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultByIntitutionsTypeRepository.save({
            results_id: resultId,
            created_by: user,
            last_updated_by: user,
            other_institution: this.isNullData(el?.other_institution),
            institution_types_id: this.isNullData(el.institution_types_id),
            graduate_students: this.isNullData(el?.graduate_students),
            institution_roles_id: 5,
            how_many: el?.how_many,
            addressing_demands: this.isNullData(el?.addressing_demands),
          });
        }
      }
    }

    if (crtr?.measures?.length) {
      const { measures } = crtr;
      for (const el of measures) {
        let ripm: ResultIpMeasure = null;
        if (el?.result_ip_measure_id) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              result_ip_measure_id: el.result_ip_measure_id,
            },
          });
        } else if (!ripm && el?.unit_of_measure) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: el.unit_of_measure,
              result_id: resultId,
              quantity: el?.quantity,
            },
          });
        } else if (!ripm) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: IsNull(),
              result_id: resultId,
              quantity: el?.quantity,
            },
          });
        }

        if (ripm) {
          if (!el?.unit_of_measure && el?.is_active != false) {
            return {
              response: { valid: false },
              message: 'The field Unit of Measure is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultIpMeasureRepository.update(
            ripm.result_ip_measure_id,
            {
              unit_of_measure: this.isNullData(el.unit_of_measure),
              quantity: this.isNullData(el.quantity),
              last_updated_by: user,
              is_active: el.is_active == undefined ? true : el.is_active,
              addressing_demands: this.isNullData(el?.addressing_demands),
            },
          );
        } else {
          if (!el?.unit_of_measure) {
            return {
              response: { valid: false },
              message: 'The field Unit of Measure',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultIpMeasureRepository.save({
            result_id: resultId,
            quantity: this.isNullData(el?.quantity),
            unit_of_measure: this.isNullData(el?.unit_of_measure),
            created_by: user,
            last_updated_by: user,
            addressing_demands: this.isNullData(el?.addressing_demands),
          });
        }
      }
    }
  }

  isNullData(data: any) {
    return data == undefined ? null : data;
  }

  async saveInitiativeInvestment(
    resultId: number,
    user: number,
    { initiative_expected_investment: inv }: CreateInnovationDevDto,
  ) {
    try {
      if (inv?.length) {
        const initiativeInvestments = inv;

        for (const initiative of initiativeInvestments) {
          const ibr = await this._resultByInitiativeRepository.findOne({
            where: {
              result_id: resultId,
              is_active: true,
              id: initiative.result_initiative_id,
            },
          });

          if (ibr) {
            const rie: ResultInitiativeBudget =
              await this._resultInitiativesBudgetRepository.findOne({
                where: {
                  result_initiative_id: ibr.id,
                  is_active: true,
                },
              });

            if (rie) {
              rie.kind_cash = initiative.kind_cash;
              rie.is_determined = initiative.is_determined;
              rie.last_updated_by = user;

              await this._resultInitiativesBudgetRepository.save(rie);
            } else {
              const newRie = this._resultInitiativesBudgetRepository.create({
                result_initiative_id: ibr.id,
                kind_cash: initiative.kind_cash,
                is_determined: initiative.is_determined,
                created_by: user,
                last_updated_by: user,
              });

              await this._resultInitiativesBudgetRepository.save(newRie);
            }
          }
        }

        return {
          valid: true,
        };
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveBillateralInvestment(
    resultId: number,
    user: number,
    { bilateral_expected_investment: inv }: CreateInnovationDevDto,
  ) {
    try {
      if (inv?.length) {
        const bei = inv;

        bei.forEach(async (i) => {
          const npp = await this._nonPooledProjectRepository.findOne({
            where: {
              results_id: resultId,
              is_active: true,
              id: i.non_pooled_projetct_id,
            },
          });

          if (npp) {
            const rbb = await this._resultBilateralBudgetRepository.findOne({
              where: {
                non_pooled_projetct_id: npp.id,
                is_active: true,
              },
            });

            if (rbb) {
              await this._resultBilateralBudgetRepository.update(
                rbb.non_pooled_projetct_budget_id,
                {
                  kind_cash: i.kind_cash,
                  is_determined: i.is_determined,
                  last_updated_by: user,
                },
              );
            } else {
              await this._resultBilateralBudgetRepository.save({
                non_pooled_projetct_id: npp.id,
                kind_cash: i.kind_cash,
                is_determined: i.is_determined,
                created_by: user,
                last_updated_by: user,
              });
            }
          }
        });

        return {
          valid: true,
        };
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async savePartnerInvestment(
    user: number,
    { institutions_expected_investment: inv }: CreateInnovationDevDto,
  ) {
    try {
      if (inv?.length) {
        const iei = inv;

        for (const el of iei) {
          let existBud: ResultInstitutionsBudget = null;
          if (el?.result_institutions_budget_id) {
            existBud = await this._resultInstitutionsBudgetRepository.findOne({
              where: {
                result_institutions_budget_id:
                  el?.result_institutions_budget_id,
              },
            });
          } else if (!existBud) {
            existBud = await this._resultInstitutionsBudgetRepository.findOne({
              where: { result_institution_id: el.result_institution_id },
            });
          }

          if (existBud) {
            await this._resultInstitutionsBudgetRepository.update(
              el?.result_institutions_budget_id,
              {
                last_updated_by: user,
                is_determined: el?.is_determined,
                kind_cash: el?.kind_cash,
              },
            );
          } else {
            await this._resultInstitutionsBudgetRepository.save({
              result_institution_id: el?.result_institutions_budget_id,
              last_updated_by: user,
              is_determined: el?.is_determined,
              kind_cash: el?.kind_cash,
              created_by: user,
            });
          }
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
