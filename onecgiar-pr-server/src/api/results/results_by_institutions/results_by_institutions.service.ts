import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, Not } from 'typeorm';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByInstitution } from './entities/results_by_institution.entity';
import { SaveResultsByInstitutionDto } from './dto/save_results_by_institution.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../result.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultByInstitutionsByDeliveriesType } from '../result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';
import { InstitutionRoleEnum } from './entities/institution_role.enum';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { ResultsKnowledgeProduct } from '../results-knowledge-products/entities/results-knowledge-product.entity';
import { ChangeTracker } from '../../../shared/utils/change-tracker';
import { ResultInstitutionsBudget } from '../result_budget/entities/result_institutions_budget.entity';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultsCenter } from '../results-centers/entities/results-center.entity';
import { NonPooledProjectDto } from '../non-pooled-projects/dto/non-pooled-project.dto';
import { ResultsCenterDto } from '../results-centers/dto/results-center.dto';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ResultsByProjectsService } from '../results_by_projects/results_by_projects.service';
import { SavePartnersV2Dto } from './dto/save-partners-v2.dto';
import { ResultsByProjectsRepository } from '../results_by_projects/results_by_projects.repository';

@Injectable()
export class ResultsByInstitutionsService {
  constructor(
    private readonly _dataSource: DataSource,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    private readonly _handlersError: HandlersError,
    private readonly _userRepository: UserRepository,
    private readonly _resultKnowledgeProductRepository: ResultsKnowledgeProductsRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _globalParameterRepository: GlobalParameterRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _resultsByProjectsService: ResultsByProjectsService,
    private readonly _resultsBilateralRepository: ResultsByProjectsRepository,
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

  async getGetInstitutionsPartnersByResultId(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      if (!result?.id) {
        throw {
          response: resultId,
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const knowledgeProduct =
        await this._resultKnowledgeProductRepository.findOne({
          where: { results_id: resultId },
          relations: { result_knowledge_product_institution_array: true },
        });

      if (
        result.result_type_id === 6 &&
        !knowledgeProduct?.result_knowledge_product_id
      ) {
        throw {
          response: { result_id: resultId },
          message: 'Knowledge Product Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let institutions: any = [];
      institutions = await this._resultByIntitutionsRepository.find({
        where: {
          result_id: resultId,
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

      const npProject =
        await this._nonPooledProjectRepository.getAllNPProjectByResultId(
          resultId,
          1,
        );
      const resCenters =
        await this._resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );

      return {
        response: {
          no_applicable_partner: !!result.no_applicable_partner,
          institutions,
          mqap_institutions,
          contributing_np_projects: npProject,
          contributing_center: resCenters,
          is_lead_by_partner: !!result.is_lead_by_partner,
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
        relations: {
          result_by_institution_array: {
            delivery: true,
            result_institution_budget_array: true,
          },
        },
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

      if (knowledgeProduct) {
        knowledgeProduct.result_knowledge_product_institution_array =
          knowledgeProduct.result_knowledge_product_institution_array.filter(
            (rki) => rki.is_active,
          );
      }

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
        is_lead_by_partner: data.is_lead_by_partner,
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
          incomingResult.result_type_id ===
            ResultTypeEnum.INNOVATION_DEVELOPMENT,
          data.result_id,
          user.id,
        );
      }

      const { contributing_np_projects, contributing_center } = data;

      await this.handleNonPooledProjects(contributing_np_projects, data, user);
      await this.handleContributingCenters(contributing_center, data, user);

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

  /**
   * P25: guarda instituciones/partners + centers + bilateral_projects (nuevo),
   * reusa MQAP, budgets y deliveries del legacy; elimina NPP.
   */
  async savePartnersInstitutionsByResultV2(
    data: SavePartnersV2Dto,
    user: TokenDto,
  ) {
    try {
      return await this._dataSource.transaction(async () => {
        const incomingResult = await this._resultRepository.findOne({
          where: { id: data.result_id },
          relations: {
            result_by_institution_array: {
              delivery: true,
              result_institution_budget_array: true,
            },
          },
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
            where: { results_id: incomingResult.id },
            relations: {
              result_knowledge_product_institution_array: {
                result_by_institution_object: {
                  result_kp_mqap_institution_object: true,
                  delivery: true,
                },
              },
            },
          });

        if (knowledgeProduct) {
          knowledgeProduct.result_knowledge_product_institution_array =
            knowledgeProduct.result_knowledge_product_institution_array.filter(
              (rki) => rki.is_active,
            );
        }

        if (knowledgeProduct && data.mqap_institutions?.length) {
          await this.handleMqapInstitutionsUpdate(
            data.mqap_institutions as any,
            knowledgeProduct,
            user.id,
            confidenceThreshold,
          );
        }

        await this._resultRepository.update(incomingResult.id, {
          no_applicable_partner: data.no_applicable_partner,
          is_lead_by_partner: data.is_lead_by_partner,
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
          const isInnovation = [
            ResultTypeEnum.INNOVATION_DEVELOPMENT,
            ResultTypeEnum.INNOVATION_USE,
          ].includes(incomingResult.result_type_id);
          console.log('isInnovation', isInnovation);
          await this.handleInstitutions(
            data.institutions ?? [],
            oldPartners,
            !!knowledgeProduct,
            isInnovation,
            data.result_id,
            user.id,
          );
        }

        await this.handleContributingCenters(
          data.contributing_center ?? [],
          data,
          user,
        );

        if (Array.isArray(data.bilateral_project)) {
          const syncResult =
            await this._resultsByProjectsService.syncBilateralProjects(
              data.result_id,
              data.bilateral_project,
              user.id,
            );

          if (syncResult?.status && syncResult.status >= 400) {
            throw {
              response: syncResult.response ?? {},
              message:
                syncResult.message ?? 'Failed to sync bilateral projects',
              status: syncResult.status,
            };
          }

          const activeProjects = await this._resultsBilateralRepository.find({
            where: { result_id: data.result_id, is_active: true },
          });

          await Promise.all(
            activeProjects.map((project) =>
              this.updateOrSaveResultProjectBudget(project.id, user),
            ),
          );
        }

        const current = await this.getInstitutionsPartnersByResultIdV2(
          data.result_id,
        );

        return {
          response: current.response,
          message: 'Successfully updated partners (P25)',
          status: HttpStatus.OK,
        };
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * GET V2 (formato P25): institutions + mqap + centers + bilateral_projects
   * (sin contributing_np_projects)
   */
  async getInstitutionsPartnersByResultIdV2(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      if (!result?.id) {
        throw {
          response: resultId,
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const knowledgeProduct =
        await this._resultKnowledgeProductRepository.findOne({
          where: { results_id: resultId },
          relations: { result_knowledge_product_institution_array: true },
        });

      let institutions: any[] = await this._resultByIntitutionsRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
          institution_roles_id: knowledgeProduct
            ? InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS
            : InstitutionRoleEnum.PARTNER,
        },
        relations: {
          delivery: true,
          obj_institutions: { obj_institution_type_code: true },
        },
        order: { id: 'ASC' },
      });

      institutions = institutions.map((i) => ({
        ...i,
        delivery: i.delivery.filter((d) => d.is_active),
        obj_institutions: i.obj_institutions
          ? {
              name: i.obj_institutions.name,
              website_link: i.obj_institutions.website_link,
              obj_institution_type_code: {
                id: i.obj_institutions.obj_institution_type_code.code,
                name: i.obj_institutions.obj_institution_type_code.name,
              },
            }
          : null,
      }));

      let mqap_institutions: any[] = [];
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
                  ?.name,
              },
            };
          }

          return mappedInstitution;
        });
      }

      const contributing_center =
        await this._resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );

      const bilateral_projects =
        await this._resultsBilateralRepository.findResultsByProjectsByResultId(
          resultId,
        );

      return {
        response: {
          no_applicable_partner: !!result.no_applicable_partner,
          institutions,
          mqap_institutions,
          bilateral_projects,
          contributing_center,
          is_lead_by_partner: !!result.is_lead_by_partner,
        },
        message: 'Successful response (P25)',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async handleContributingCenters(
    contributing_center: ResultsCenterDto[],
    data: { result_id: number },
    user: TokenDto,
  ) {
    if (contributing_center?.length) {
      const centerArray = contributing_center.map((el) => el.code);
      await this._resultsCenterRepository.updateCenter(
        data.result_id,
        centerArray,
        user.id,
      );

      const resultCenterArray: ResultsCenter[] = [];

      for (const center of contributing_center) {
        const exists =
          await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
            data.result_id,
            center.code,
          );

        const resultCenterData = {
          center_id: center.code,
          result_id: data.result_id,
          created_by: user.id,
          last_updated_by: user.id,
          is_leading_result: center.is_leading_result,
        };

        if (!exists) {
          const newResultCenter = new ResultsCenter();
          Object.assign(newResultCenter, resultCenterData);
          resultCenterArray.push(newResultCenter);
        } else {
          exists.is_leading_result = center.is_leading_result;
          exists.last_updated_by = user.id;
          resultCenterArray.push(exists);
        }
      }

      if (resultCenterArray.length) {
        await this._resultsCenterRepository.save(resultCenterArray);
      }
    } else {
      await this._resultsCenterRepository.updateCenter(
        data.result_id,
        [],
        user.id,
      );
    }
  }

  private async updateNonPooledProjectsById(
    resultId: number,
    titleArray: string[],
    userId: number,
  ) {
    await this._nonPooledProjectRepository.updateNPProjectById(
      resultId,
      titleArray,
      userId,
      1,
    );
    await this._nonPooledProjectRepository.update(
      { results_id: resultId },
      { is_active: false },
    );
  }

  private async updateOrSaveProject(
    project: NonPooledProjectDto,
    data: SaveResultsByInstitutionDto,
    user: TokenDto,
  ) {
    const existingProject = await this._nonPooledProjectRepository.findOne({
      where: {
        results_id: data.result_id,
        grant_title: project.grant_title,
        funder_institution_id: project.funder,
        non_pooled_project_type_id: 1,
      },
    });

    const projectData = {
      center_grant_id: project.center_grant_id,
      funder_institution_id: project.funder,
      lead_center_id: String(project.lead_center),
      is_active: true,
      last_updated_by: user.id,
    };

    if (existingProject) {
      await this._nonPooledProjectRepository.update(
        existingProject.id,
        projectData,
      );
    } else {
      await this._nonPooledProjectRepository.save({
        ...projectData,
        results_id: data.result_id,
        grant_title: project.grant_title,
        created_by: user.id,
        non_pooled_project_type_id: 1,
      });
    }
  }

  private async updateOrSaveNonPooledBudget(projectId: number, user: TokenDto) {
    const existingBudget = await this._resultBilateralBudgetRepository.findOne({
      where: { non_pooled_projetct_id: projectId },
    });

    const budgetData = {
      non_pooled_projetct_id: projectId,
      is_active: true,
      last_updated_by: user.id,
    };

    if (!existingBudget) {
      await this._resultBilateralBudgetRepository.save({
        ...budgetData,
        created_by: user.id,
      });
    } else {
      await this._resultBilateralBudgetRepository.update(projectId, budgetData);
    }
  }

  private async updateOrSaveResultProjectBudget(
    projectId: number,
    user: TokenDto,
  ) {
    const existingBudget = await this._resultBilateralBudgetRepository.findOne({
      where: { result_project_id: projectId },
    });

    const budgetData = {
      result_project_id: projectId,
      is_active: true,
      last_updated_by: user.id,
    };

    if (!existingBudget) {
      await this._resultBilateralBudgetRepository.save({
        ...budgetData,
        created_by: user.id,
      });
    } else {
      await this._resultBilateralBudgetRepository.update(
        { result_project_id: projectId },
        budgetData,
      );
    }
  }

  private async handleNonPooledProjects(
    contributing_np_projects: NonPooledProjectDto[],
    data: SaveResultsByInstitutionDto,
    user: TokenDto,
  ) {
    if (contributing_np_projects?.length) {
      const titleArray = contributing_np_projects.map((el) => el.grant_title);
      await this.updateNonPooledProjectsById(
        data.result_id,
        titleArray,
        user.id,
      );

      for (const project of contributing_np_projects) {
        if (project?.grant_title?.length) {
          await this.updateOrSaveProject(project, data, user);
        }
      }

      const activeProjects = await this._nonPooledProjectRepository.find({
        where: { results_id: data.result_id, is_active: true },
      });

      for (const project of activeProjects) {
        await this.updateOrSaveNonPooledBudget(project.id, user);
      }
    } else {
      await this.updateNonPooledProjectsById(data.result_id, [], user.id);
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
            is_leading_result: incomingMqapInstitution.is_leading_result,
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
    const { added: initialAdded, removed } =
      ChangeTracker.trackChangesForObjects(
        oldInstitutions,
        incomingInstitutions,
        'id',
      );
    let added = initialAdded;

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
        toAdd.is_leading_result = a.is_leading_result;
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

    const toUpdate = oldInstitutions.filter(
      (i) => !removed.some((r) => r.id === i.id),
    );
    const updatedNewBudgets: ResultInstitutionsBudget[] = [];

    for (const institutionToUpdate of toUpdate) {
      const newData = incomingInstitutions.find(
        (i) => i.id === institutionToUpdate.id,
      );

      if (newData) {
        institutionToUpdate.last_updated_by = userId;
        institutionToUpdate.institutions_id = newData.institutions_id;
        institutionToUpdate.is_leading_result = newData.is_leading_result;
      }

      if (isInnoDev) {
        if (institutionToUpdate.result_institution_budget_array?.length > 0) {
          const activeBudgets =
            institutionToUpdate.result_institution_budget_array.filter(
              (b) => b.is_active,
            );
          let workingBudget: ResultInstitutionsBudget;
          if (activeBudgets?.length > 0) {
            workingBudget = activeBudgets.shift();

            activeBudgets.forEach((b) => {
              b.is_active = false;
              b.last_updated_by = userId;
              updatedNewBudgets.push(b);
            });
          } else {
            workingBudget = new ResultInstitutionsBudget();

            workingBudget.created_by = userId;
            workingBudget.result_institution_id = institutionToUpdate.id;
          }

          workingBudget.is_active = true;
          workingBudget.last_updated_by = userId;
          updatedNewBudgets.push(workingBudget);
        } else {
          const newBudget = new ResultInstitutionsBudget();

          newBudget.created_by = userId;
          newBudget.result_institution_id = institutionToUpdate.id;
          newBudget.is_active = true;

          updatedNewBudgets.push(newBudget);
        }
      }
    }

    await this._resultByIntitutionsRepository.save(toUpdate);
    await this._resultInstitutionsBudgetRepository.save(updatedNewBudgets);

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
