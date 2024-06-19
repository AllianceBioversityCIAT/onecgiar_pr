import { HttpStatus, Injectable } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByInstitution } from './entities/results_by_institution.entity';
import { SaveResultsByInstitutionDto } from './dto/save_results_by_institution.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../result.repository';
import { VersionsService } from '../versions/versions.service';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultByInstitutionsByDeliveriesType } from '../result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { InstitutionRoleEnum } from './entities/institution_role.enum';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';

@Injectable()
export class ResultsByInstitutionsService {
  constructor(
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    private readonly _handlersError: HandlersError,
    private readonly _userRepository: UserRepository,
    private readonly _resultKnowledgeProductRepository: ResultsKnowledgeProductsRepository,
    private readonly _resultsKnowledgeProductInstitutionRepository: ResultsKnowledgeProductInstitutionRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _globalParameterRepository: GlobalParameterRepository,
  ) {}

  create(createResultsByInstitutionDto: CreateResultsByInstitutionDto) {
    return createResultsByInstitutionDto;
  }

  async getGetInstitutionsByResultId(id: number) {
    try {
      const intitutions =
        await this._resultByIntitutionsRepository.getResultByInstitutionFull(
          id,
        );
      if (!intitutions.length) {
        throw {
          response: {},
          message: 'Institutions Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: intitutions,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getGetInstitutionsActorsByResultId(id: number) {
    try {
      const intitutions =
        await this._resultByIntitutionsRepository.getResultByInstitutionActorsFull(
          id,
        );
      if (!intitutions.length) {
        throw {
          response: {},
          message: 'Institutions Actors Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: intitutions,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getGetInstitutionsPartnersByResultId(id: number) {
    try {
      const result = await this._resultRepository.getResultById(id);
      if (!result?.id) {
        throw {
          response: id,
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const knowledgeProduct =
        await this._resultKnowledgeProductRepository.findOne({
          where: { results_id: id },
          relations: { result_knowledge_product_institution_array: true },
        });

      if (
        result.result_type_id === 6 &&
        !knowledgeProduct?.result_knowledge_product_id
      ) {
        throw {
          response: { result_id: id },
          message: 'Knowledge Product Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let institutions: any = [];
      institutions = await this._resultByIntitutionsRepository.find({
        where: {
          result_id: id,
          is_active: true,
          institution_roles_id: InstitutionRoleEnum.PARTNER,
        },
        relations: ['delivery', 'obj_institutions.obj_institution_type_code'],
      });

      institutions = institutions.map((institution) => ({
        ...institution,
        delivery: institution.delivery.filter((delivery) => delivery.is_active),
        obj_institutions: {
          name: institution.obj_institutions.name,
          website_link: institution.obj_institutions.website_link,
          obj_institution_type_code: {
            name: institution.obj_institutions.obj_institution_type_code.name,
          },
        },
      }));

      let mqap_institutions: any = [];

      if (knowledgeProduct) {
        mqap_institutions = await this._resultByIntitutionsRepository.find({
          where: {
            result_id: result.id,
            is_active: true,
            institution_roles_id:
              InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
            is_predicted: Not(IsNull()),
            result_kp_mqap_institution_id: Not(IsNull()),
          },
          relations: [
            'result_kp_mqap_institution_obj',
            'delivery',
            'obj_institutions.obj_institution_type_code',
          ],
        });

        mqap_institutions = mqap_institutions.map((institution) => ({
          ...institution,
          delivery: institution.delivery.filter(
            (delivery) => delivery.is_active,
          ),
          obj_institutions: {
            name: institution.obj_institutions.name,
            website_link: institution.obj_institutions.website_link,
            obj_institution_type_code: {
              name: institution.obj_institutions.obj_institution_type_code.name,
            },
          },
        }));
      }

      return {
        response: {
          no_applicable_partner: !!result.no_applicable_partner,
          institutions,
          mqap_institutions,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private getEmptyResultByInstitution(): ResultsByInstitution {
    const resultByInstitution = new ResultsByInstitution();

    resultByInstitution['id'] = null;
    resultByInstitution['institutions_id'] = null;
    resultByInstitution['institutions_name'] = null;
    resultByInstitution['institutions_acronym'] = null;
    resultByInstitution['institution_roles_id'] = null;
    resultByInstitution['institutions_type_id'] = null;
    resultByInstitution['institutions_type_name'] = null;
    resultByInstitution['deliveries'] = [];

    return resultByInstitution;
  }

  async savePartnersInstitutionsByResult(
    data: SaveResultsByInstitutionDto,
    user: TokenDto,
  ) {
    try {
      const incomingResult = await this._resultRepository.getResultById(
        data.result_id,
      );
      if (!incomingResult) {
        throw {
          response: {},
          message: 'Result Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const incomingUser = await this._userRepository.getUserById(user.id);
      if (!incomingUser) {
        throw {
          response: user,
          message: 'User Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const knowledgeProduct =
        await this._resultKnowledgeProductRepository.findOneBy({
          results_id: incomingResult.id,
        });

      if (knowledgeProduct && data.mqap_institutions?.length) {
        await this.handleMqapInstitutions(
          data.mqap_institutions,
          incomingResult.id,
          user.id,
        );
      }

      await this._resultRepository.update(incomingResult.id, {
        no_applicable_partner: data.no_applicable_partner,
      });
      if (data.no_applicable_partner === true) {
        const partnersToInactive =
          await this._resultByIntitutionsRepository.find({
            where: {
              result_id: incomingResult.id,
              institution_roles_id: InstitutionRoleEnum.PARTNER,
              is_active: true,
            },
          });

        for (const partner of partnersToInactive) {
          await this._resultByIntitutionsRepository.update(
            {
              id: +partner.id,
            },
            {
              is_active: false,
            },
          );

          await this._resultByInstitutionsByDeliveriesTypeRepository.update(
            { result_by_institution_id: partner.id },
            { is_active: false },
          );
        }
      } else {
        await this.handleInstitutions(
          data.institutions,
          data.result_id,
          user.id,
        );
      }

      const getInstitutions = await this.getGetInstitutionsPartnersByResultId(
        data.result_id,
      );
      return {
        response: getInstitutions.response,
        message: 'Successfully updated partners',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private async handleMqapInstitutions(
    mqapInstitutions: ResultsByInstitution[],
    resultId: number,
    userId: number,
  ) {
    for (const institution of mqapInstitutions) {
      const mqapInstitutionExist =
        await this._resultByIntitutionsRepository.findOneBy({
          result_id: resultId,
          institution_roles_id:
            InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
          result_kp_mqap_institution_id:
            institution.result_kp_mqap_institution_id,
        });

      if (mqapInstitutionExist) {
        await this.updateMqapInstitution(
          mqapInstitutionExist.id,
          institution,
          userId,
        );
        await this.handleDeliveries(
          institution.delivery,
          institution.id,
          userId,
        );
      }
    }
  }

  private async updateMqapInstitution(
    id: number,
    institution: ResultsByInstitution,
    userId: number,
  ) {
    const globalParameter = await this._globalParameterRepository.findOne({
      where: { name: 'kp_mqap_institutions_confidence' },
      select: ['value'],
    });

    if (!globalParameter) {
      throw new Error(
        "Global parameter 'kp_mqap_institutions_confidence' not found",
      );
    }

    const confidenceThreshold = +globalParameter.value;
    await this._resultByIntitutionsRepository.update(
      { id },
      {
        last_updated_by: userId,
        is_active: institution.is_active,
        institutions_id: institution.institutions_id,
        is_predicted:
          institution.institutions_id ===
            institution.result_kp_mqap_institution_obj
              .predicted_institution_id &&
          institution.result_kp_mqap_institution_obj.confidant >=
            confidenceThreshold
            ? true
            : false,
      },
    );
  }

  private async handleDeliveries(
    deliveries: ResultByInstitutionsByDeliveriesType[],
    institutionId: number,
    userId: number,
  ) {
    if (!deliveries) return;

    for (const delivery of deliveries) {
      const existingDelivery =
        await this._resultByInstitutionsByDeliveriesTypeRepository.findOne({
          where: {
            result_by_institution_id: institutionId,
            partner_delivery_type_id: delivery.partner_delivery_type_id,
            is_active: true,
          },
        });

      if (existingDelivery) {
        await this._resultByInstitutionsByDeliveriesTypeRepository.update(
          { id: existingDelivery.id },
          {
            is_active: delivery.is_active,
            last_updated_by: userId,
          },
        );
      } else {
        await this._resultByInstitutionsByDeliveriesTypeRepository.save({
          result_by_institution_id: institutionId,
          partner_delivery_type_id: delivery.partner_delivery_type_id,
          created_by: userId,
          last_updated_by: userId,
          is_active: true,
        });
      }
    }
  }

  private async handleInstitutions(
    institutions: ResultsByInstitution[],
    resultId: number,
    userId: number,
  ) {
    for (const institution of institutions) {
      const isInstitutions = await this._resultByIntitutionsRepository.findOne({
        where: {
          result_id: resultId,
          institutions_id: institution.institutions_id,
          institution_roles_id: InstitutionRoleEnum.PARTNER,
          is_active: true,
        },
      });

      if (!isInstitutions) {
        const newInstitution = await this._resultByIntitutionsRepository.save({
          created_by: userId,
          institution_roles_id:
            institution.institution_roles_id ?? InstitutionRoleEnum.PARTNER,
          institutions_id: institution.institutions_id,
          last_updated_by: userId,
          result_id: resultId,
          is_active: true,
        });

        await this._resultInstitutionsBudgetRepository.save({
          result_institution_id: newInstitution.id,
          created_by: userId,
          last_updated_by: userId,
        });

        await this.handleDeliveries(
          institution.delivery,
          newInstitution.id,
          userId,
        );
      } else {
        await this._resultByIntitutionsRepository.update(
          { id: isInstitutions.id },
          {
            is_active: institution.is_active,
            last_updated_by: userId,
            institutions_id: institution.institutions_id,
          },
        );

        await this.handleDeliveries(
          institution.delivery,
          isInstitutions.id,
          userId,
        );
      }
    }
  }
}
