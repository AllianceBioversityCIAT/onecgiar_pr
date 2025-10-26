import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateInnovationUseDto } from './dto/create-innovation-use.dto';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { LinkedResultsService } from '../../results/linked-results/linked-results.service';
import { ResultActor } from '../../results/result-actors/entities/result-actor.entity';
import { IsNull } from 'typeorm';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultsByInstitutionType } from '../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasure } from '../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';

@Injectable()
export class InnovationUseService {

  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _linkedResultService: LinkedResultsService,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
  ) {}

  async saveInnovationUse(
    innovationUseDto: CreateInnovationUseDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      if (!resultId) {
        throw {
          response: {},
          message: 'Missing data in the request',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      const resultExist = await this._resultRepository.findOne({
        where: { id: resultId },
      });

      const InnovationUse = await this.saveAnticipatedInnoUser(
        resultExist.id,
        user.id,
        innovationUseDto,
      );

      await this._linkedResultService.createForInnovationUse(resultExist.id, innovationUseDto.linked_results, user);

      return {
        response: InnovationUse,
        message: 'Results Innovations Use has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async saveAnticipatedInnoUser(resultId: number, user: number, crtr: CreateInnovationUseDto) {

    // Actors
    if (crtr?.actors?.length) {
      for (const el of crtr.actors) {
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
          actorExists = await this._resultActorRepository.findOne({ where: whereOptions });
        } else if (el?.result_actors_id) {
          actorExists = await this._resultActorRepository.findOne({
            where: { result_actors_id: el.result_actors_id, result_id: resultId },
          });
        } else {
          actorExists = await this._resultActorRepository.findOne({
            where: { actor_type_id: IsNull(), result_id: resultId },
          });
        }

        this.validateRequired(el?.actor_type_id, 'The field actor type is required');

        if (actorExists) {
          await this._resultActorRepository.update(
            actorExists.result_actors_id,
            this.buildActorData(el, user, resultId)
          );
        } else {
          await this._resultActorRepository.save(this.buildActorData(el, user, resultId));
        }
      }
    }

    // Organizations
    if (crtr?.organization?.length) {
      for (const el of crtr.organization) {
        let ite: ResultsByInstitutionType = null;
        if (el?.institution_types_id && el?.institution_types_id != 78) {
          ite = await this._resultByIntitutionsTypeRepository.getNewResultByInstitutionTypeExists(
            resultId, el.institution_types_id, 5
          );
        }
        if (!ite && el?.id) {
          ite = await this._resultByIntitutionsTypeRepository.getNewResultByIdExists(
            resultId, el.id, 5
          );
        }

        this.validateRequired(el?.institution_types_id, 'The field institution type is required');

        if (ite) {
          await this._resultByIntitutionsTypeRepository.update(
            ite.id,
            this.buildInstitutionData(el, user, resultId)
          );
        } else {
          await this._resultByIntitutionsTypeRepository.save(this.buildInstitutionData(el, user, resultId));
        }
      }
    }

    // Measures
    if (crtr?.measures?.length) {
      for (const el of crtr.measures) {
        let ripm: ResultIpMeasure = null;
        if (el?.result_ip_measure_id) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: { result_ip_measure_id: el.result_ip_measure_id },
          });
        } else if (el?.unit_of_measure) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: { unit_of_measure: el.unit_of_measure, result_id: resultId, quantity: el?.quantity },
          });
        } else {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: { unit_of_measure: IsNull(), result_id: resultId, quantity: el?.quantity },
          });
        }

        this.validateRequired(el?.unit_of_measure, 'The field Unit of Measure is required');

        if (ripm) {
          await this._resultIpMeasureRepository.update(
            ripm.result_ip_measure_id,
            this.buildMeasureData(el, user, resultId)
          );
        } else {
          await this._resultIpMeasureRepository.save(this.buildMeasureData(el, user, resultId));
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

  private buildActorData(el, user, resultId) {
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
      last_updated_by: user,
      created_by: user,
      result_id: resultId,
      sex_and_age_disaggregation: el?.sex_and_age_disaggregation === true,
      how_many: el?.how_many,
      addressing_demands: this.isNullData(el?.addressing_demands),
    };
  }

  private buildInstitutionData(el, user, resultId) {
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
      is_active: el?.is_active,
    };
  }

  private buildMeasureData(el, user, resultId) {
    return {
      result_id: resultId,
      quantity: this.isNullData(el?.quantity),
      unit_of_measure: this.isNullData(el?.unit_of_measure),
      created_by: user,
      last_updated_by: user,
      addressing_demands: this.isNullData(el?.addressing_demands),
      is_active: el.is_active ?? true,
    };
  }


  async getInnovationUse(resultId: number) {
    try {
      const innDevExists =
        await this._resultsInnovationsUseRepository.InnovDevExists(
          resultId,
        );

      const linked_results: number[] = await this._resultsInnovationsUseRepository.getLinkedResultsByOrigin(resultId);

      const actorsData = await this._resultActorRepository.find({
        where: { result_id: resultId, is_active: true },
        relations: { obj_actor_type: true },
      });
      actorsData.map((el) => {
        el['men_non_youth'] = el.men - el.men_youth;
        el['women_non_youth'] = el.women - el.women_youth;
      });
      const innovatonUse = {
        ...innDevExists,
        linked_results: linked_results,
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

      return {
        response: innovatonUse,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
