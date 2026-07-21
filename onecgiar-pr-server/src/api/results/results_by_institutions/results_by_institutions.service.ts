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
import { throwServiceError } from '../../../shared/utils/service-error.util';

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
        throwServiceError('Institutions Not Found', HttpStatus.NOT_FOUND);
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
        throwServiceError(
          'Institutions Actors Not Found',
          HttpStatus.NOT_FOUND,
        );
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
        throwServiceError('Results Not Found', HttpStatus.NOT_FOUND, resultId);
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
        throwServiceError('Knowledge Product Not Found', HttpStatus.NOT_FOUND, {
          result_id: resultId,
        });
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
        throwServiceError('Result Not Found', HttpStatus.NOT_FOUND);
      }

      const incomingUser = await this._userRepository.getUserById(user.id);
      if (!incomingUser) {
        throwServiceError('User Not Found', HttpStatus.NOT_FOUND, user);
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
          throwServiceError('Result Not Found', HttpStatus.NOT_FOUND);
        }

        const incomingUser = await this._userRepository.getUserById(user.id);
        if (!incomingUser) {
          throwServiceError('User Not Found', HttpStatus.NOT_FOUND, user);
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
            ResultTypeEnum.INNOVATION_USE_IPSR,
          ].includes(incomingResult.result_type_id);
          const institutionRoleId = knowledgeProduct
            ? InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS
            : InstitutionRoleEnum.PARTNER;
          await this.handleInstitutions(
            data.institutions ?? [],
            oldPartners,
            !!knowledgeProduct,
            isInnovation,
            data.result_id,
            user.id,
          );
          await this.syncInstitutionFromTocFlags(
            data.institutions ?? [],
            data.result_id,
            institutionRoleId,
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
            throwServiceError(
              syncResult.message ?? 'Failed to sync bilateral projects',
              syncResult.status,
              syncResult.response ?? {},
            );
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
        throwServiceError('Results Not Found', HttpStatus.NOT_FOUND, resultId);
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

      // Align with P22 GET: hide partners whose Clarisa institution is inactive (P2-3181).
      institutions = institutions.filter(
        (i) => i.obj_institutions?.is_active !== false,
      );

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

  private async syncInstitutionFromTocFlags(
    incomingInstitutions: ResultsByInstitution[],
    resultId: number,
    institutionRoleId: InstitutionRoleEnum,
    userId: number,
  ) {
    if (!incomingInstitutions?.length) {
      return;
    }

    const institutionsToSync = incomingInstitutions
      .filter((inst) => inst?.institutions_id != null)
      .sort(
        (left, right) =>
          Number(left.institutions_id) - Number(right.institutions_id),
      );

    for (const inst of institutionsToSync) {
      await this._resultByIntitutionsRepository.update(
        {
          result_id: resultId,
          institutions_id: inst.institutions_id,
          institution_roles_id: institutionRoleId,
          is_active: true,
        },
        {
          from_toc: !!inst.from_toc,
          last_updated_by: userId,
        },
      );
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
          from_toc: !!center.from_toc,
        };

        if (exists) {
          exists.is_leading_result = center.is_leading_result;
          exists.from_toc = !!center.from_toc;
          exists.last_updated_by = user.id;
          resultCenterArray.push(exists);
        } else {
          const newResultCenter = new ResultsCenter();
          Object.assign(newResultCenter, resultCenterData);
          resultCenterArray.push(newResultCenter);
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

    if (existingBudget) {
      await this._resultBilateralBudgetRepository.update(projectId, budgetData);
    } else {
      await this._resultBilateralBudgetRepository.save({
        ...budgetData,
        created_by: user.id,
      });
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

    if (existingBudget) {
      await this._resultBilateralBudgetRepository.update(
        { result_project_id: projectId },
        budgetData,
      );
    } else {
      await this._resultBilateralBudgetRepository.save({
        ...budgetData,
        created_by: user.id,
      });
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

  private _partnerInstitutionRoleId(
    isKnowledgeProduct: boolean,
  ): InstitutionRoleEnum {
    return isKnowledgeProduct
      ? InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS
      : InstitutionRoleEnum.PARTNER;
  }

  private async _deactivateRemovedPartnerInstitutions(
    removed: ResultsByInstitution[],
    userId: number,
  ): Promise<void> {
    if (!removed.length) {
      return;
    }

    const removedIds = removed.map((i) => i.id);
    await this._resultByIntitutionsRepository.update(
      { id: In(removedIds) },
      { is_active: false, last_updated_by: userId },
    );
    await this._resultInstitutionsBudgetRepository.update(
      { result_institution_id: In(removedIds) },
      { is_active: false, last_updated_by: userId },
    );
    await this._resultByInstitutionsByDeliveriesTypeRepository.update(
      { result_by_institution_id: In(removedIds) },
      { is_active: false, last_updated_by: userId },
    );
  }

  private async _upsertAddedPartnerInstitutions(
    added: ResultsByInstitution[],
    isKnowledgeProduct: boolean,
    isInnoDev: boolean,
    resultId: number,
    userId: number,
  ): Promise<ResultsByInstitution[]> {
    if (!added.length) {
      return [];
    }

    const institutionRoleId =
      this._partnerInstitutionRoleId(isKnowledgeProduct);
    const incomingInstitutionIds = added
      .map((a) => a.institutions_id)
      .filter((id) => id != null);

    const existingInstitutions =
      incomingInstitutionIds.length > 0
        ? await this._resultByIntitutionsRepository.find({
            where: {
              result_id: resultId,
              institutions_id: In(incomingInstitutionIds),
              institution_roles_id: institutionRoleId,
            },
          })
        : [];

    const existingMap = new Map<number, ResultsByInstitution>();
    for (const existing of existingInstitutions) {
      existingMap.set(existing.institutions_id, existing);
    }

    const institutionsToReactivate: ResultsByInstitution[] = [];
    const institutionsToCreate: ResultsByInstitution[] = [];

    for (const incoming of added) {
      const existing = existingMap.get(incoming.institutions_id);
      if (existing) {
        existing.is_active = true;
        existing.last_updated_by = userId;
        existing.institutions_id = incoming.institutions_id;
        existing.is_leading_result = incoming.is_leading_result;
        existing.from_toc = !!incoming.from_toc;
        existing.delivery = incoming.delivery ?? [];
        institutionsToReactivate.push(existing);
        continue;
      }

      const toAdd = new ResultsByInstitution();
      toAdd.created_by = userId;
      toAdd.last_updated_by = userId;
      toAdd.is_active = true;
      toAdd.result_id = resultId;
      toAdd.institutions_id = incoming.institutions_id;
      toAdd.institution_roles_id = institutionRoleId;
      toAdd.delivery = incoming.delivery ?? [];
      toAdd['isNew'] = true;
      toAdd.is_leading_result = incoming.is_leading_result;
      toAdd.from_toc = !!incoming.from_toc;
      institutionsToCreate.push(toAdd);
    }

    if (institutionsToReactivate.length) {
      await this._resultByIntitutionsRepository.save(institutionsToReactivate);
    }

    let savedAdded: ResultsByInstitution[];
    if (institutionsToCreate.length) {
      const created =
        await this._resultByIntitutionsRepository.save(institutionsToCreate);
      savedAdded = [...institutionsToReactivate, ...created];
    } else {
      savedAdded = institutionsToReactivate;
    }

    if (isInnoDev) {
      await this._resultInstitutionsBudgetRepository.save(
        savedAdded.map((institution) => {
          const budget = new ResultInstitutionsBudget();
          budget.created_by = userId;
          budget.result_institution_id = institution.id;
          budget.is_active = true;
          return budget;
        }),
      );
    }

    return savedAdded;
  }

  private _applyIncomingPartnerFields(
    institution: ResultsByInstitution,
    incoming: ResultsByInstitution | undefined,
    userId: number,
  ): void {
    if (!incoming) {
      return;
    }
    institution.last_updated_by = userId;
    institution.institutions_id = incoming.institutions_id;
    institution.is_leading_result = incoming.is_leading_result;
  }

  private _appendPartnerInstitutionBudget(
    institution: ResultsByInstitution,
    userId: number,
    budgetsToSave: ResultInstitutionsBudget[],
  ): void {
    if (institution.result_institution_budget_array?.length > 0) {
      const activeBudgets = institution.result_institution_budget_array.filter(
        (b) => b.is_active,
      );
      let workingBudget: ResultInstitutionsBudget;
      if (activeBudgets.length > 0) {
        workingBudget = activeBudgets.shift();
        activeBudgets.forEach((budget) => {
          budget.is_active = false;
          budget.last_updated_by = userId;
          budgetsToSave.push(budget);
        });
      } else {
        workingBudget = new ResultInstitutionsBudget();
        workingBudget.created_by = userId;
        workingBudget.result_institution_id = institution.id;
      }
      workingBudget.is_active = true;
      workingBudget.last_updated_by = userId;
      budgetsToSave.push(workingBudget);
      return;
    }

    const newBudget = new ResultInstitutionsBudget();
    newBudget.created_by = userId;
    newBudget.result_institution_id = institution.id;
    newBudget.is_active = true;
    budgetsToSave.push(newBudget);
  }

  private _collectPartnerInstitutionBudgetUpdates(
    toUpdate: ResultsByInstitution[],
    incomingInstitutions: ResultsByInstitution[],
    isInnoDev: boolean,
    userId: number,
  ): ResultInstitutionsBudget[] {
    const updatedBudgets: ResultInstitutionsBudget[] = [];
    for (const institution of toUpdate) {
      const incoming = incomingInstitutions.find(
        (i) => i.id === institution.id,
      );
      this._applyIncomingPartnerFields(institution, incoming, userId);
      if (isInnoDev) {
        this._appendPartnerInstitutionBudget(
          institution,
          userId,
          updatedBudgets,
        );
      }
    }
    return updatedBudgets;
  }

  private _dtoHasDelivery(dto: ResultsByInstitution | undefined): boolean {
    return dto != null && Object.prototype.hasOwnProperty.call(dto, 'delivery');
  }

  private async _syncPartnerInstitutionDeliveries(
    toUpdate: ResultsByInstitution[],
    added: ResultsByInstitution[],
    incomingInstitutions: ResultsByInstitution[],
    userId: number,
  ): Promise<void> {
    for (const institution of toUpdate.concat(added)) {
      if (institution['isNew']) {
        const incoming = institution.delivery ?? [];
        if (incoming.length) {
          await this.handleDeliveries(incoming, [], institution.id, userId);
        }
        continue;
      }

      const dto = incomingInstitutions.find((i) => i.id === institution.id);
      if (!this._dtoHasDelivery(dto)) {
        continue;
      }

      await this.handleDeliveries(
        dto?.delivery ?? [],
        institution.delivery ?? [],
        institution.id,
        userId,
      );
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

    await this._deactivateRemovedPartnerInstitutions(removed, userId);

    const added = await this._upsertAddedPartnerInstitutions(
      initialAdded,
      isKnowledgeProduct,
      isInnoDev,
      resultId,
      userId,
    );

    const toUpdate = oldInstitutions.filter(
      (institution) =>
        !removed.some((removedItem) => removedItem.id === institution.id),
    );
    const updatedNewBudgets = this._collectPartnerInstitutionBudgetUpdates(
      toUpdate,
      incomingInstitutions,
      isInnoDev,
      userId,
    );

    await this._resultByIntitutionsRepository.save(toUpdate);
    await this._resultInstitutionsBudgetRepository.save(updatedNewBudgets);
    await this._syncPartnerInstitutionDeliveries(
      toUpdate,
      added,
      incomingInstitutions,
      userId,
    );
  }
}
