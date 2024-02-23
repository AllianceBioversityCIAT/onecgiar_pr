import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { UpdateResultsByInstitutionDto } from './dto/update-results_by_institution.dto';
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
import { MQAPInstitutionDto } from './dto/mqap-institutions.dto';
import { InstitutionRoleEnum } from './entities/institution_role.enum';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';

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
      const knowledgeProduct =
        await this._resultKnowledgeProductRepository.findOne({
          where: {
            results_id: id,
          },
          relations: {
            result_knowledge_product_institution_array: true,
          },
        });

      if (!result?.id) {
        throw {
          response: id,
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (
        result.result_type_id == 6 &&
        !knowledgeProduct?.result_knowledge_product_id
      ) {
        throw {
          response: { result_id: id },
          message: 'Knowledge Product Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const institutions =
        await this._resultByIntitutionsRepository.getResultByInstitutionPartnersFull(
          id,
          knowledgeProduct
            ? [
                InstitutionRoleEnum.PARTNER,
                InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
              ]
            : [InstitutionRoleEnum.PARTNER],
        );

      if (institutions.length) {
        const institutionsId: number[] = institutions.map((el) => el.id);
        const delivery =
          await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(
            institutionsId,
          );
        institutions.map((inst) => {
          inst['deliveries'] = delivery
            .filter((dl) => dl.result_by_institution_id == inst.id)
            .map((res) => res.partner_delivery_type_id);
        });
      }

      let mqap_institutions: MQAPInstitutionDto[] = null;

      if (knowledgeProduct) {
        mqap_institutions =
          knowledgeProduct.result_knowledge_product_institution_array
            .filter((rkpi) => rkpi.is_active)
            .map((rkpi) => {
              const mqapInstitution: MQAPInstitutionDto =
                new MQAPInstitutionDto();

              mqapInstitution.confidant = rkpi.confidant;
              mqapInstitution.intitution_name = rkpi.intitution_name;
              mqapInstitution.predicted_institution_id =
                rkpi.predicted_institution_id;
              mqapInstitution.result_kp_mqap_institution_id =
                rkpi.result_kp_mqap_institution_id;
              mqapInstitution.user_matched_institution =
                institutions.find(
                  (i) => i.id === rkpi.results_by_institutions_id,
                ) || this.getEmptyResultByInstitution();

              return mqapInstitution;
            });
      }

      return {
        response: {
          no_applicable_partner: result.no_applicable_partner ? true : false,
          institutions: knowledgeProduct
            ? institutions.filter(
                (i) =>
                  i.institution_roles_id ==
                  InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
              )
            : institutions,
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

      if (knowledgeProduct) {
        if (data.mqap_institutions?.length) {
          //here we filter out from the additional contributors the mqap manual mappings
          data.institutions = data.institutions.filter(
            (i) =>
              !data.mqap_institutions
                .filter(
                  (mqap) => mqap.user_matched_institution?.institutions_id,
                )
                .find(
                  (mqap) =>
                    mqap.user_matched_institution.institutions_id ==
                    i.institutions_id,
                ),
          );
        }

        /*
          in case we have additional contributors, we need to merge them with the 
          mqap manually mapped institutions
        */
        const additionalContributors = (data.institutions ?? []).map((i) => {
          i['institution_roles_id'] =
            InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS;
          return i;
        });

        const partners = data.mqap_institutions
          .filter((ma) => ma.user_matched_institution?.institutions_id)
          .map((ma) => {
            const institution = ma.user_matched_institution;
            institution['institution_mqap_id'] =
              ma.result_kp_mqap_institution_id;
            return institution;
          });

        await this._resultByIntitutionsRepository.updateIstitutions(
          data.result_id,
          additionalContributors,
          user.id,
          data?.no_applicable_partner,
          [InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS],
        );
        data.institutions = data?.no_applicable_partner
          ? partners
          : [...additionalContributors, ...partners];
      }

      const result =
        await this._resultByIntitutionsRepository.updateIstitutions(
          data.result_id,
          data.institutions,
          user.id,
          data?.no_applicable_partner,
          [InstitutionRoleEnum.PARTNER],
        );

      incomingResult.no_applicable_partner = data.no_applicable_partner;
      await this._resultRepository.save(incomingResult);
      for (let index = 0; index < data.institutions.length; index++) {
        const incomingInstitution = data.institutions[index];
        const isInstitutions =
          await this._resultByIntitutionsRepository.getResultByInstitutionExists(
            data.result_id,
            incomingInstitution.institutions_id,
            incomingInstitution?.institution_roles_id ??
              InstitutionRoleEnum.PARTNER,
          );
        if (!isInstitutions) {
          const institutionsNew: ResultsByInstitution =
            new ResultsByInstitution();
          institutionsNew.created_by = user.id;
          institutionsNew.institution_roles_id =
            incomingInstitution['institution_roles_id'] ??
            InstitutionRoleEnum.PARTNER;
          institutionsNew.institutions_id = incomingInstitution.institutions_id;
          institutionsNew.last_updated_by = user.id;
          institutionsNew.result_id = data.result_id;
          institutionsNew.is_active = true;
          const responseInstitution =
            await this._resultByIntitutionsRepository.save(institutionsNew);

          await this._resultInstitutionsBudgetRepository.save({
            result_institution_id: institutionsNew.id,
            created_by: user.id,
            last_updated_by: user.id,
          });

          if (knowledgeProduct) {
            const kpInstitution =
              await this._resultsKnowledgeProductInstitutionRepository.findOneBy(
                {
                  result_kp_mqap_institution_id:
                    incomingInstitution.institution_mqap_id ?? 0,
                },
              );

            if (kpInstitution) {
              this._resultsKnowledgeProductInstitutionRepository.update(
                {
                  result_kp_mqap_institution_id:
                    incomingInstitution.institution_mqap_id,
                },
                { results_by_institutions_id: responseInstitution.id },
              );
            }
          }

          const delivery = incomingInstitution.deliveries;
          if (delivery) {
            const InstitutionsDeliveriesArray: ResultByInstitutionsByDeliveriesType[] =
              [];
            for (let i = 0; i < delivery.length; i++) {
              const newInstitutionsDeliveries =
                new ResultByInstitutionsByDeliveriesType();
              newInstitutionsDeliveries.result_by_institution_id =
                responseInstitution.id;
              newInstitutionsDeliveries.partner_delivery_type_id = delivery[i];
              newInstitutionsDeliveries.last_updated_by = user.id;
              newInstitutionsDeliveries.created_by = user.id;
              InstitutionsDeliveriesArray.push(newInstitutionsDeliveries);
            }
            await this._resultByInstitutionsByDeliveriesTypeRepository.save(
              InstitutionsDeliveriesArray,
            );
          }
        } else {
          if (knowledgeProduct) {
            const kpInstitution =
              await this._resultsKnowledgeProductInstitutionRepository.findOneBy(
                {
                  result_kp_mqap_institution_id:
                    incomingInstitution.institution_mqap_id ?? 0,
                },
              );

            if (kpInstitution) {
              this._resultsKnowledgeProductInstitutionRepository.update(
                {
                  result_kp_mqap_institution_id:
                    incomingInstitution.institution_mqap_id,
                },
                { results_by_institutions_id: isInstitutions.id },
              );
            }
          }
          const delivery = incomingInstitution.deliveries;
          await this._resultByInstitutionsByDeliveriesTypeRepository.inactiveResultDeLivery(
            isInstitutions.id,
            incomingInstitution.deliveries,
            user.id,
          );
          const InstitutionsDeliveriesArray: ResultByInstitutionsByDeliveriesType[] =
            [];
          if (delivery) {
            for (let i = 0; i < delivery.length; i++) {
              const exist =
                await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByTypeAndResultByInstitution(
                  isInstitutions.id,
                  incomingInstitution.deliveries[i],
                );
              if (!exist) {
                const newInstitutionsDeliveries =
                  new ResultByInstitutionsByDeliveriesType();
                newInstitutionsDeliveries.result_by_institution_id =
                  isInstitutions.id;
                newInstitutionsDeliveries.partner_delivery_type_id =
                  delivery[i];
                newInstitutionsDeliveries.last_updated_by = user.id;
                newInstitutionsDeliveries.created_by = user.id;
                InstitutionsDeliveriesArray.push(newInstitutionsDeliveries);
              }
            }
            await this._resultByInstitutionsByDeliveriesTypeRepository.save(
              InstitutionsDeliveriesArray,
            );
          }
        }
      }

      return {
        response: {
          result,
        },
        message: 'Successfully update partners',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  findAll() {
    return `This action returns all resultsByInstitutions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsByInstitution`;
  }

  update(
    id: number,
    updateResultsByInstitutionDto: UpdateResultsByInstitutionDto,
  ) {
    return `This action updates a #${id} resultsByInstitution ${updateResultsByInstitutionDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByInstitution`;
  }
}
