import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultsPackageTocResultDto } from './dto/create-results-package-toc-result.dto';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { VersionsService } from '../../results/versions/versions.service';
import { ResultRepository } from '../../results/result.repository';
import { Version } from '../../versioning/entities/version.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { IpsrRepository } from '../repository/ipsr.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { CreateTocShareResult } from '../../results/share-result-request/dto/create-toc-share-result.dto';
import { ShareResultRequestService } from '../../results/share-result-request/share-result-request.service';
import { ShareResultRequestRepository } from '../../results/share-result-request/share-result-request.repository';
import { NonPooledProject } from '../../results/non-pooled-projects/entities/non-pooled-project.entity';
import { ResultIpEoiOutcomeRepository } from '../innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { In, Not } from 'typeorm';

@Injectable()
export class ResultsPackageTocResultService {
  constructor(
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    private readonly _resultIpEoiOutcomesRepository: ResultIpEoiOutcomeRepository,
    private readonly _shareResultRequestService: ShareResultRequestService,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _ipsrRepository: IpsrRepository,
    private readonly _handlersError: HandlersError,
    private readonly _returnResponse: ReturnResponse,
    private readonly _versioningService: VersioningService,
    private readonly _resultTocResultService: ResultsTocResultsService,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    protected readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
  ) {}

  async create(crtr: CreateResultsPackageTocResultDto, user: TokenDto) {
    try {
      const rip = await this._resultRepository.getResultById(crtr.result_id);
      if (!rip) {
        throw {
          response: {
            result_id: crtr.result_id,
          },
          message: `result_id: ${crtr.result_id} - does not exist`,
          status: HttpStatus.BAD_REQUEST,
        };
      }
      const iprsCore = await this._ipsrRepository.findOne({
        where: {
          result_innovation_package_id: rip.id,
          is_active: true,
          ipsr_role_id: 1,
        },
      });
      const result = await this._resultRepository.getResultById(
        iprsCore.result_id,
      );
      if (!result) {
        throw {
          response: {
            result_id: rip.id,
          },
          message: `IPSR: The result id ${rip.id} does not exist`,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.IPSR,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      if (
        crtr?.contributing_initiatives?.accepted_contributing_initiatives.length
      ) {
        const { contributing_initiatives: ci } = crtr;
        for (const init of ci?.accepted_contributing_initiatives ?? []) {
          if (init?.is_active == false) {
            await this._resultByInitiativesRepository.update(
              { result_id: rip.id, initiative_id: init.id },
              { is_active: false },
            );
          }
        }
      }

      if (
        crtr?.contributing_initiatives?.pending_contributing_initiatives.length
      ) {
        const { contributing_initiatives: ci } = crtr;
        const dataRequest: CreateTocShareResult = {
          isToc: false,
          initiativeShareId: ci?.pending_contributing_initiatives.map(
            (el) => el.id,
          ),
        };
        await this._shareResultRequestService.resultRequest(
          dataRequest,
          rip.id,
          user,
        );
        const cancelRequest = ci?.pending_contributing_initiatives?.filter(
          (e) => !e.is_active,
        );
        if (cancelRequest?.length) {
          await this._shareResultRequestRepository.cancelRequest(
            cancelRequest.map((e) => e.share_result_request_id),
          );
        }
      }

      // * Save contributing np projects
      if (crtr?.contributing_np_projects?.length) {
        const { contributing_np_projects: cnpp } = crtr;
        const titles = cnpp.map((el) => el.grant_title);

        await this._nonPooledProjectRepository.updateNPProjectById(
          rip.id,
          titles,
          user.id,
          1,
        );

        for (const cpnp of cnpp) {
          let nonPP: NonPooledProject = null;
          if (cpnp?.grant_title?.length) {
            if (cpnp?.id) {
              nonPP =
                await this._nonPooledProjectRepository.getAllNPProjectByNPId(
                  rip.id,
                  cpnp.id,
                  1,
                );
            } else {
              nonPP =
                await this._nonPooledProjectRepository.getAllNPProjectById(
                  rip.id,
                  cpnp.grant_title,
                  1,
                );
            }

            if (nonPP) {
              await this._nonPooledProjectRepository.update(nonPP.id, {
                is_active: true,
                center_grant_id: cpnp.center_grant_id,
                funder_institution_id: cpnp.funder,
                lead_center_id: cpnp.lead_center,
                last_updated_by: user.id,
                grant_title: cpnp.grant_title,
              });
            } else {
              await this._nonPooledProjectRepository.save({
                results_id: rip.id,
                center_grant_id: cpnp.center_grant_id,
                grant_title: cpnp.grant_title,
                funder_institution_id: cpnp.funder,
                lead_center_id: cpnp.lead_center,
                created_by: user.id,
                last_updated_by: user.id,
                non_pooled_project_type_id: 1,
              });

              const existingNppRole2 =
                await this._nonPooledProjectRepository.findOne({
                  where: {
                    results_id: rip.id,
                    center_grant_id: cpnp.center_grant_id,
                    grant_title: cpnp.grant_title,
                    funder_institution_id: cpnp.funder,
                    lead_center_id: cpnp.lead_center,
                    non_pooled_project_type_id: 2,
                  },
                });

              if (!existingNppRole2) {
                const newNppRole2 = await this._nonPooledProjectRepository.save(
                  {
                    results_id: rip.id,
                    center_grant_id: cpnp.center_grant_id,
                    grant_title: cpnp.grant_title,
                    funder_institution_id: cpnp.funder,
                    lead_center_id: cpnp.lead_center,
                    created_by: user.id,
                    last_updated_by: user.id,
                    non_pooled_project_type_id: 2,
                  },
                );

                await this._resultBilateralBudgetRepository.save({
                  non_pooled_projetct_id: newNppRole2.id,
                  created_by: user.id,
                  last_updated_by: user.id,
                });
              }
            }
          }
        }
        await this.deleteRemovedNppCascade(rip.id, user.id);
      } else {
        await this._nonPooledProjectRepository.updateNPProjectById(
          rip.id,
          [],
          user.id,
          1,
        );
        await this.deleteRemovedNppCascade(rip.id, user.id);
      }

      // * Save contributing center
      if (crtr?.contributing_center?.length) {
        const { contributing_center: cc } = crtr;
        const code = cc.map((el) => el.code);
        await this._resultsCenterRepository.updateCenter(rip.id, code, user.id);

        for (const cenCC of cc) {
          cenCC.primary = cenCC.primary || false;
          const rpC =
            await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
              rip.id,
              cenCC.code,
            );
          if (rpC) {
            this._resultsCenterRepository.update(rpC.id, {
              is_active: true,
              is_primary: cenCC.primary,
              last_updated_by: user.id,
            });
          } else {
            await this._resultsCenterRepository.save({
              center_id: cenCC.code,
              result_id: rip.id,
              created_by: user.id,
              last_updated_by: user.id,
              is_primary: cenCC.primary,
            });
          }
        }
      } else {
        await this._resultsCenterRepository.updateCenter(rip.id, [], user.id);
      }

      // * Save Primary Submitter ResultTocResult
      await this._resultTocResultService.saveResultTocResultPrimary(
        crtr,
        user,
        rip,
        crtr.result_id,
      );

      // * Save Contributors ResultTocResult
      await this._resultTocResultService.saveResultTocResultContributor(
        crtr.contributors_result_toc_result,
        user,
        rip,
        crtr.result_id,
        rip.initiative_id,
      );

      // * Save Indicators & Indicators Targets
      if (crtr?.result_toc_result?.result_toc_results?.length) {
        await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
          crtr,
        );
        await this._resultsTocResultRepository.saveIndicatorsContributors(crtr);
      }

      // * Save EOI
      await this.saveIpEoi(crtr, rip.id, user);

      // * Save Institutions
      if (crtr?.institutions.length) {
        const { institutions: inst } = crtr;
        await this._resultByIntitutionsRepository.updateInstitutions(
          rip.id,
          inst,
          user.id,
        );
        for (const ins of inst) {
          const instExist =
            await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(
              rip.id,
              ins.institutions_id,
              2,
            );
          let rbi: ResultsByInstitution = null;
          if (!instExist) {
            rbi = await this._resultByIntitutionsRepository.save({
              institution_roles_id: 2,
              institutions_id: ins.institutions_id,
              result_id: rip.id,
              created_by: user.id,
              last_updated_by: user.id,
            });

            await this._resultInstitutionsBudgetRepository.save({
              result_institution_id: rbi.id,
              last_updated_by: user?.id,
              created_by: user.id,
            });
          }

          if (ins?.deliveries?.length) {
            const { deliveries } = ins;
            await this.saveDeliveries(
              instExist ? instExist : rbi,
              deliveries,
              user.id,
              version,
            );
          } else {
            await this._resultByInstitutionsByDeliveriesTypeRepository.inactiveResultDeLivery(
              (instExist ? instExist : rbi).id,
              [],
              user.id,
            );
          }
        }
      } else {
        await this._resultByIntitutionsRepository.updateInstitutions(
          rip.id,
          [],
          user.id,
        );
      }

      return {
        response: {},
        message: 'The toc data is successfully created',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  protected async saveDeliveries(
    inst: ResultsByInstitution,
    deliveries: number[],
    userId: number,
    v: Version,
  ) {
    await this._resultByInstitutionsByDeliveriesTypeRepository.inactiveResultDeLivery(
      inst.id,
      deliveries,
      userId,
    );
    for (const deli of deliveries) {
      const deliExist =
        await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByTypeAndResultByInstitution(
          inst.id,
          deli,
        );
      if (!deliExist) {
        await this._resultByInstitutionsByDeliveriesTypeRepository.save({
          partner_delivery_type_id: deli,
          result_by_institution_id: inst.id,
          last_updated_by: userId,
          created_by: userId,
          versions_id: v.id,
        });
      }
    }
  }

  async saveIpEoi(
    createResultsPackageTocResultDto: CreateResultsPackageTocResultDto,
    resultByInnovationPackageId: number,
    user: TokenDto,
  ) {
    const { result_toc_results } =
      createResultsPackageTocResultDto.result_toc_result;
    try {
      if (result_toc_results?.length) {
        for (const rtr of result_toc_results) {
          const searchTocResult =
            await this._resultsTocResultRepository.findOne({
              where: { toc_result_id: rtr.toc_result_id, is_active: true },
            });

          if (!searchTocResult) {
            return {
              response: { valid: true },
              message: 'No End of Initiative Outcomes were found',
              status: HttpStatus.NOT_FOUND,
            };
          }

          const resultByInnoPckg = await this._ipsrRepository.findOne({
            where: {
              result_innovation_package_id: resultByInnovationPackageId,
              is_active: true,
              ipsr_role_id: 1,
            },
          });

          const searchIpEoi = await this._resultIpEoiOutcomesRepository.findOne(
            {
              where: {
                result_by_innovation_package_id:
                  resultByInnoPckg?.result_by_innovation_package_id,
                contributing_toc: true,
                is_active: true,
              },
            },
          );

          if (!searchIpEoi || rtr?.['toc_level_id'] === 3) {
            return this._returnResponse.format({
              message: `The EOI cannot be saved because the Toc level is 3 or the EOI does not have an eoi result ID.`,
              statusCode: HttpStatus.BAD_REQUEST,
              response: { valid: false },
            });
          }

          await this._resultIpEoiOutcomesRepository.update(
            searchIpEoi?.result_ip_eoi_outcome_id,
            {
              is_active: false,
              contributing_toc: false,
              last_updated_by: user.id,
            },
          );

          return {
            response: { valid: true },
            message: 'No End of Initiative Outcomes were saved',
            status: HttpStatus.OK,
          };
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findOne(resultId: number) {
    try {
      const resultInit =
        await this._resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );
      const [conInit, conPending] = await Promise.all([
        await this._resultByInitiativesRepository.getContributorInitiativeByResult(
          resultId,
        ),
        await this._resultByInitiativesRepository.getPendingInit(resultId),
      ]);

      const contributingInititiatives = {
        accepted_contributing_initiatives: conInit,
        pending_contributing_initiatives: conPending,
      };

      const npProject =
        await this._nonPooledProjectRepository.getAllNPProjectByResultId(
          resultId,
          1,
        );
      const resCenters =
        await this._resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );
      const institutions =
        await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(
          resultId,
          2,
        );
      const deliveries =
        await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(
          institutions?.map((el) => el.id),
        );
      institutions.map((int) => {
        int['deliveries'] = deliveries
          .filter((del) => del.result_by_institution_id == int.id)
          .map((del) => del.partner_delivery_type_id);
      });
      let resTocRes: any[] = [];
      let result_toc_results: any[] = [];
      let resTocResConResponse: any[] = [];
      const individualResponses = [];
      resTocRes = await this._resultsTocResultRepository.getRTRPrimary(
        resultId,
        [resultInit.id],
        true,
      );
      if (!resTocRes?.length) {
        resTocRes = [
          {
            action_area_outcome_id: null,
            toc_result_id: null,
            planned_result: null,
            results_id: resultId,
            initiative_id: resultInit.id,
            short_name: resultInit.short_name,
            official_code: resultInit.official_code,
          },
        ];
      }
      resTocRes[0]['toc_level_id'] =
        resTocRes[0]['planned_result'] != null &&
        resTocRes[0]['planned_result'] == 0
          ? 3
          : resTocRes[0]['toc_level_id'];
      for (const init of conInit) {
        result_toc_results =
          await this._resultsTocResultRepository.getRTRPrimary(
            resultId,
            [resultInit.id],
            false,
            [init.id],
          );
        result_toc_results.forEach((el) => {
          if (el['planned_result'] === false) {
            el['toc_level_id'] = 3;
          }
        });

        resTocResConResponse = [
          {
            planned_result: null,
            initiative_id: resTocRes
              ? result_toc_results[0].initiative_id
              : null,
            official_code: resTocRes
              ? result_toc_results[0].official_code
              : null,
            short_name: resTocRes ? result_toc_results[0].short_name : null,
            result_toc_results,
          },
        ];

        resTocResConResponse.forEach((response) => {
          individualResponses.push({
            planned_result: response?.planned_result,
            initiative_id: response?.initiative_id,
            official_code: response?.official_code,
            short_name: response?.short_name,
            result_toc_results: response?.result_toc_results,
          });
        });
      }
      conPending.forEach((pending) => {
        individualResponses.push({
          planned_result: null,
          initiative_id: pending?.id,
          official_code: pending?.official_code,
          short_name: pending?.short_name,
          result_toc_results: [],
        });
      });

      return {
        response: {
          contributing_initiatives: contributingInititiatives,
          contributing_np_projects: npProject,
          contributing_center: resCenters,
          result_toc_result: {
            planned_result: null,
            initiative_id: resTocRes ? resTocRes[0].initiative_id : null,
            official_code: resTocRes ? resTocRes[0].official_code : null,
            short_name: resTocRes ? resTocRes[0].short_name : null,
            result_toc_results: resTocRes,
          },
          contributors_result_toc_result: individualResponses,
          institutions: institutions,
        },
        message: 'The toc data is successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private async deleteRemovedNppCascade(
    resultId: number,
    userId: number,
  ): Promise<void> {
    try {
      //
      const inactiveNppRole1 = await this._nonPooledProjectRepository.find({
        where: {
          results_id: resultId,
          non_pooled_project_type_id: 1,
          is_active: false,
        },
      });

      if (inactiveNppRole1.length > 0) {
        const inactiveTitles = inactiveNppRole1.map((npp) => npp.grant_title);

        const nppRole2ToDelete = await this._nonPooledProjectRepository.find({
          where: {
            results_id: resultId,
            non_pooled_project_type_id: 2,
            grant_title: In(inactiveTitles),
            is_active: true,
          },
        });

        if (nppRole2ToDelete.length > 0) {
          const nppRole2Ids = nppRole2ToDelete.map((npp) => npp.id);

          await this._resultBilateralBudgetRepository.update(
            { non_pooled_projetct_id: In(nppRole2Ids) },
            { is_active: false, last_updated_by: userId },
          );

          await this._nonPooledProjectRepository.update(
            { id: In(nppRole2Ids) },
            { is_active: false, last_updated_by: userId },
          );
        }
      }
    } catch (error) {
      console.error('Error en deleteRemovedNppCascade:', error);
    }
  }
}
