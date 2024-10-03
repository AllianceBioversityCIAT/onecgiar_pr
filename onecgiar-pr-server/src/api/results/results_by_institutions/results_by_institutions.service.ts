import { HttpStatus, Injectable } from '@nestjs/common';
import { In, IsNull, Not } from 'typeorm';
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
import { ResultsKnowledgeProduct } from '../results-knowledge-products/entities/results-knowledge-product.entity';
import { ChangeTracker } from '../../../shared/utils/change-tracker';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';
import { ResultInstitutionsBudget } from '../result_budget/entities/result_institutions_budget.entity';

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
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
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
          institution_roles_id: knowledgeProduct
            ? InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS
            : InstitutionRoleEnum.PARTNER,
        },
        relations: {
          delivery: true,
          obj_institutions: { obj_institution_type_code: true },
        },
      });

      institutions = institutions.map((institution) => ({
        ...institution,
        delivery: institution.delivery.filter((delivery) => delivery.is_active),
        obj_institutions: {
          name: institution.obj_institutions.name,
          website_link: institution.obj_institutions.website_link,
          obj_institution_type_code: {
            id: institution.obj_institutions.obj_institution_type_code.code,
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
            institution_roles_id: InstitutionRoleEnum.PARTNER,
            is_predicted: Not(IsNull()),
            result_kp_mqap_institution_id: Not(IsNull()),
          },
          relations: {
            result_kp_mqap_institution_object: true,
            delivery: true,
            obj_institutions: { obj_institution_type_code: true },
          },
          order: { is_predicted: 'ASC' },
        });

        mqap_institutions = mqap_institutions.map((institution) => {
          const mappedInstitution = {
            ...institution,
            delivery: institution.delivery.filter(
              (delivery) => delivery.is_active,
            ),
          };

          if (institution.obj_institutions) {
            mappedInstitution.obj_institutions = {
              name: institution.obj_institutions.name,
              website_link: institution.obj_institutions.website_link,
              obj_institution_type_code: {
                name: institution.obj_institutions.obj_institution_type_code
                  .name,
              },
            };
          }

          return mappedInstitution;
        });
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

  async savePartnersInstitutionsByResult(
    data: SaveResultsByInstitutionDto,
    user: TokenDto,
  ) {
    try {
      const incomingResult = await this._resultRepository.findOne({
        where: { id: data.result_id },
        relations: { result_by_institution_array: { delivery: true } },
      });
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

      const knowledgeProduct =
        await this._resultKnowledgeProductRepository.findOne({
          where: {
            results_id: incomingResult.id,
            result_knowledge_product_institution_array: {
              is_active: true,
            },
          },
          relations: {
            result_knowledge_product_institution_array: {
              result_by_institution_object: {
                result_kp_mqap_institution_object: true,
                delivery: true,
              },
            },
          },
        });

      const resultsInnovationsDev =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          incomingResult.id,
        );

      if (knowledgeProduct && data.mqap_institutions?.length) {
        await this.handleMqapInstitutionsUpdate(
          data.mqap_institutions,
          knowledgeProduct,
          user.id,
          confidenceThreshold,
        );
      }

      await this._resultRepository.update(incomingResult.id, {
        no_applicable_partner: data.no_applicable_partner,
      });

      const oldPartners = incomingResult.result_by_institution_array.filter(
        (rbi) =>
          rbi.is_active &&
          rbi.institution_roles_id ==
            (knowledgeProduct
              ? InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS
              : InstitutionRoleEnum.PARTNER),
      );

      if (data.no_applicable_partner === true) {
        await this._resultByIntitutionsRepository.update(
          { id: In(oldPartners.map((p) => p.id)) },
          { is_active: false, last_updated_by: user.id },
        );

        await this._resultByInstitutionsByDeliveriesTypeRepository.update(
          { result_by_institution_id: In(oldPartners.map((p) => p.id)) },
          { is_active: false, last_updated_by: user.id },
        );

        await this._resultInstitutionsBudgetRepository.update(
          { result_institution_id: In(oldPartners.map((p) => p.id)) },
          { is_active: false, last_updated_by: user.id },
        );
      } else {
        await this.handleInstitutions(
          data.institutions,
          oldPartners,
          !!knowledgeProduct,
          !!resultsInnovationsDev,
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

  private async handleMqapInstitutionsUpdate(
    incomingMqapInstitutions: ResultsByInstitution[],
    knowledgeProduct: ResultsKnowledgeProduct,
    userId: number,
    confidenceThreshold: number,
  ) {
    const oldMqapInstitutions =
      knowledgeProduct.result_knowledge_product_institution_array.map(
        (rkmi) => rkmi.result_by_institution_object,
      );

    for (const oldMqapInstitution of oldMqapInstitutions) {
      const incomingMqapInstitution = incomingMqapInstitutions.find(
        (i) => i.id === oldMqapInstitution.id,
      );

      if (incomingMqapInstitution) {
        await this._resultByIntitutionsRepository.update(
          { id: incomingMqapInstitution.id },
          {
            last_updated_by: userId,
            is_active: incomingMqapInstitution.is_active,
            institutions_id: incomingMqapInstitution.institutions_id,
            is_predicted:
              incomingMqapInstitution.institutions_id ===
                incomingMqapInstitution.result_kp_mqap_institution_object
                  .predicted_institution_id &&
              incomingMqapInstitution.result_kp_mqap_institution_object
                .confidant >= confidenceThreshold,
          },
        );

        await this.handleDeliveries(
          incomingMqapInstitution.delivery,
          oldMqapInstitution.delivery,
          oldMqapInstitution.id,
          userId,
        );
      }
    }
  }

  private async handleDeliveries(
    incomingDeliveries: ResultByInstitutionsByDeliveriesType[],
    oldDeliveries: ResultByInstitutionsByDeliveriesType[],
    rbiId: number,
    userId: number,
  ) {
    if (rbiId) {
      const { added, removed } = ChangeTracker.trackChangesForObjects(
        oldDeliveries.filter((od) => od.is_active),
        incomingDeliveries,
        'partner_delivery_type_id',
      );

      if (removed.length) {
        await this._resultByInstitutionsByDeliveriesTypeRepository.update(
          { id: In(removed.map((d) => d.id)) },
          { is_active: false, last_updated_by: userId },
        );
      }

      if (added.length) {
        added.forEach((delivery) => {
          delivery.result_by_institution_id = rbiId;
          delivery.created_by = userId;
          delivery.last_updated_by = userId;
          delivery.is_active = true;
        });

        await this._resultByInstitutionsByDeliveriesTypeRepository.save(added);
      }
    }
  }

  private async handleInstitutions(
    incomingInstitutions: ResultsByInstitution[],
    oldInstitutions: ResultsByInstitution[],
    isKnowledgeProduct: boolean,
    isInnoDev: boolean,
    resultId: number,
    userId: number,
  ) {
    // eslint-disable-next-line prefer-const
    let { added, removed } = ChangeTracker.trackChangesForObjects(
      oldInstitutions,
      incomingInstitutions,
      'id',
    );

    //handling removed result_by_institutions
    if (removed.length) {
      await this._resultByIntitutionsRepository.update(
        { id: In(removed.map((i) => i.id)) },
        { is_active: false, last_updated_by: userId },
      );

      await this._resultInstitutionsBudgetRepository.update(
        { result_institution_id: In(removed.map((i) => i.id)) },
        { is_active: false, last_updated_by: userId },
      );

      await this._resultByInstitutionsByDeliveriesTypeRepository.update(
        { id: In(removed.map((d) => d.id)) },
        { is_active: false, last_updated_by: userId },
      );
    }

    //handling added result_by_institutions
    if (added.length) {
      added = added.map((a) => {
        const toAdd = new ResultsByInstitution();

        toAdd.created_by = userId;
        toAdd.last_updated_by = userId;
        toAdd.is_active = true;
        toAdd.result_id = resultId;
        toAdd.institutions_id = a.institutions_id;
        toAdd.institution_roles_id = isKnowledgeProduct
          ? InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS
          : InstitutionRoleEnum.PARTNER;
        toAdd.delivery = a.delivery;
        toAdd['isNew'] = true;

        return toAdd;
      });

      added = await this._resultByIntitutionsRepository.save(added);

      if (isInnoDev) {
        const resultInstitutionsBudgets = added.map((a) => {
          const toAdd = new ResultInstitutionsBudget();

          toAdd.created_by = userId;
          toAdd.result_institution_id = a.id;
          toAdd.is_active = true;

          return toAdd;
        });

        await this._resultInstitutionsBudgetRepository.save(
          resultInstitutionsBudgets,
        );
      }
    }

    // handling modfiy result_by_institutions
    const toUpdate = oldInstitutions.filter(
      (i) => !removed.some((r) => r.id === i.id),
    );

    for (const institutionToUpdate of toUpdate) {
      const newData = incomingInstitutions.find(
        (i) => i.id === institutionToUpdate.id,
      );

      if (newData) {
        institutionToUpdate.last_updated_by = userId;
        institutionToUpdate.institutions_id = newData.institutions_id;
      }
    }

    await this._resultByIntitutionsRepository.save(toUpdate);

    //handling deliveries from added and updated result_by_institutions
    for (const toUpdateDeliveries of toUpdate.concat(added)) {
      await this.handleDeliveries(
        toUpdateDeliveries['isNew']
          ? toUpdateDeliveries.delivery
          : (incomingInstitutions.find((i) => i.id === toUpdateDeliveries.id)
              ?.delivery ?? []),
        toUpdateDeliveries['isNew'] ? [] : toUpdateDeliveries.delivery,
        toUpdateDeliveries.id,
        userId,
      );
    }
  }
}
