import {
  Injectable,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ResultBilateralDto,
  RootResultsDto,
  CreateBilateralDto,
} from './dto/create-bilateral.dto';
import { ResultRepository } from '../results/result.repository';
import { VersioningService } from '../versioning/versioning.service';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { HandlersError } from '../../shared/handlers/error.utils';
import { Result, SourceEnum } from '../results/entities/result.entity';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ClarisaRegionsRepository } from '../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { DataSource, In, Like } from 'typeorm';
import { ClarisaGeographicScopeRepository } from '../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultRegionRepository } from '../results/result-regions/result-regions.repository';
import { ClarisaCountriesRepository } from '../../clarisa/clarisa-countries/ClarisaCountries.repository';
import { ResultCountryRepository } from '../results/result-countries/result-countries.repository';
import { ClarisaSubnationalScopeRepository } from '../../clarisa/clarisa-subnational-scope/clarisa-subnational-scope.repository';
import { ResultCountrySubnationalRepository } from '../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultCountry } from '../results/result-countries/entities/result-country.entity';
import { YearRepository } from '../results/years/year.repository';
import { ResultRegion } from '../results/result-regions/entities/result-region.entity';
import { InstitutionRoleEnum } from '../results/results_by_institutions/entities/institution_role.enum';
import { ResultByIntitutionsRepository } from '../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsByInstitution } from '../results/results_by_institutions/entities/results_by_institution.entity';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { EvidencesService } from '../results/evidences/evidences.service';
import { EvidencesRepository } from '../results/evidences/evidences.repository';
import { Evidence } from '../results/evidences/entities/evidence.entity';
import { ResultsKnowledgeProductsRepository } from '../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ClarisaCentersRepository } from '../../clarisa/clarisa-centers/clarisa-centers.repository';
import { UserService } from '../../auth/modules/user/user.service';
import { CreateUserDto } from '../../auth/modules/user/dto/create-user.dto';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ClarisaProjectsRepository } from '../../clarisa/clarisa-projects/clarisa-projects.repository';
import { ResultsByProjectsRepository } from '../results/results_by_projects/results_by_projects.repository';
import { ClarisaCenter } from '../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaInstitution } from '../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { KnowledgeProductBilateralHandler } from './handlers/knowledge-product.handler';
import { CapacityChangeBilateralHandler } from './handlers/capacity-change.handler';
import { InnovationDevelopmentBilateralHandler } from './handlers/innovation-development.handler';
import { InnovationUseBilateralHandler } from './handlers/innovation-use.handler';
import { PolicyChangeBilateralHandler } from './handlers/policy-change.handler';
import { BilateralResultTypeHandler } from './handlers/bilateral-result-type-handler.interface';
import { NoopBilateralHandler } from './handlers/noop.handler';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';

@Injectable()
export class BilateralService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versioningService: VersioningService,
    private readonly _userRepository: UserRepository,
    private readonly _clarisaRegionsRepository: ClarisaRegionsRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _geoScopeRepository: ClarisaGeographicScopeRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _clarisaCountriesRepository: ClarisaCountriesRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _clarisaSubnationalAreasRepository: ClarisaSubnationalScopeRepository,
    private readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly _evidencesRepository: EvidencesRepository,
    private readonly _evidencesService: EvidencesService,
    private readonly _resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
    private readonly _clarisaCenters: ClarisaCentersRepository,
    private readonly _userService: UserService,
    private readonly _resultsTocResultsRepository: ResultsTocResultRepository,
    private readonly _clarisaInitiatives: ClarisaInitiativesRepository,
    private readonly _resultsTocResultsIndicatorsRepository: ResultsTocResultIndicatorsRepository,
    private readonly _resultsTocTargetIndicatorRepository: ResultsTocTargetIndicatorRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _clarisaProjectsRepository: ClarisaProjectsRepository,
    private readonly _resultsByProjectsRepository: ResultsByProjectsRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _knowledgeProductHandler: KnowledgeProductBilateralHandler,
    private readonly _capacityChangeHandler: CapacityChangeBilateralHandler,
    private readonly _innovationDevelopmentHandler: InnovationDevelopmentBilateralHandler,
    private readonly _innovationUseHandler: InnovationUseBilateralHandler,
    private readonly _policyChangeHandler: PolicyChangeBilateralHandler,
    private readonly _otherOutputHandler: NoopBilateralHandler,
    private readonly _otherOutcomeHandler: NoopBilateralHandler,
  ) {
    this.resultTypeHandlerMap = new Map<number, BilateralResultTypeHandler>([
      [_knowledgeProductHandler.resultType, _knowledgeProductHandler],
      [_capacityChangeHandler.resultType, _capacityChangeHandler],
      [_innovationDevelopmentHandler.resultType, _innovationDevelopmentHandler],
      [_innovationUseHandler.resultType, _innovationUseHandler],
      [_policyChangeHandler.resultType, _policyChangeHandler],
      [_otherOutputHandler.resultType, _otherOutputHandler],
      [_otherOutcomeHandler.resultType, _otherOutcomeHandler],
    ]);
  }

  private readonly logger = new Logger(BilateralService.name);
  private readonly resultTypeHandlerMap: Map<
    number,
    BilateralResultTypeHandler
  >;

  async create(rootResultsDto: RootResultsDto) {
    const incomingResults = this.unwrapIncomingResults(rootResultsDto);

    if (!incomingResults.length) {
      throw new BadRequestException(
        'At least one result payload is required in either "results" or "result".',
      );
    }

    const createdResults = [];
    let resultInfo: any = null;

    for (const result of incomingResults) {
      try {
        await this.dataSource.transaction(
          async (_transactionalEntityManager) => {
            if (!result?.data || typeof result.data !== 'object') {
              throw new BadRequestException(
                'Each result entry must include a "data" object with the bilateral payload.',
              );
            }

            const bilateralDto = result.data;

            const adminUser = await this._userRepository.findOne({
              where: { email: 'admin@prms.pr' },
            });

            const createdByUser = await this.findOrCreateUser(
              bilateralDto.created_by,
              adminUser,
            );
            const userId = createdByUser.id;

            const submittedUser = await this.findOrCreateUser(
              bilateralDto.submitted_by,
              createdByUser,
            );
            const submittedUserId = submittedUser.id;

            const version = await this._versioningService.$_findActivePhase(
              AppModuleIdEnum.REPORTING,
            );
            if (!version)
              throw this._handlersError.returnErrorRes({
                error: version,
                debug: true,
              });

            const year = await this._yearRepository.findOne({
              where: { active: true },
            });
            if (!year) throw new NotFoundException('Active year not found');

            const lastCode = await this._resultRepository.getLastResultCode();

            const resultHeader = await this.initializeResultHeader({
              bilateralDto,
              userId,
              submittedUserId,
              version,
              year,
              lastCode,
            });
            const newResultHeader = resultHeader;
            const resultId = resultHeader.id;

            await this.handleLeadCenter(
              resultId,
              bilateralDto.lead_center,
              userId,
            );

            const {
              scope_code,
              scope_label,
              regions,
              countries,
              subnational_areas,
            } = bilateralDto.geo_focus;
            const scope = await this.findScope(scope_code, scope_label);
            this.validateGeoFocus(scope, regions, countries, subnational_areas);

            await this.handleRegions(newResultHeader, scope, regions);
            await this.handleCountries(
              newResultHeader,
              countries,
              subnational_areas,
              scope.id,
              userId,
            );

            await this._resultRepository.save({
              ...newResultHeader,
              geographic_scope_id: this.resolveScopeId(scope.id, countries),
            });

            await this.handleTocMapping(
              bilateralDto.toc_mapping,
              bilateralDto.contributing_programs,
              userId,
              resultId,
            );
            await this.handleInstitutions(
              resultId,
              bilateralDto.contributing_partners || [],
              userId,
            );
            await this.handleEvidence(resultId, bilateralDto.evidence, userId);
            await this.handleNonPooledProject(
              resultId,
              userId,
              bilateralDto.contributing_bilateral_projects,
            );

            await this.runResultTypeHandlers({
              resultId,
              userId,
              bilateralDto,
              isDuplicateResult: false,
            });

            await this.handleContributingCenters(
              resultId,
              bilateralDto.contributing_center || [],
              userId,
              bilateralDto.lead_center,
            );

            const isKpType =
              bilateralDto.result_type_id === ResultTypeEnum.KNOWLEDGE_PRODUCT;
            const isCapacityChange =
              bilateralDto.result_type_id === ResultTypeEnum.CAPACITY_CHANGE;
            const isInnovationDev =
              bilateralDto.result_type_id ===
              ResultTypeEnum.INNOVATION_DEVELOPMENT;
            const isInnovationUse =
              bilateralDto.result_type_id === ResultTypeEnum.INNOVATION_USE;
            const isPolicyChange =
              bilateralDto.result_type_id === ResultTypeEnum.POLICY_CHANGE;

            let kpExtra: any = {};
            if (isKpType) {
              const kp = await this._resultsKnowledgeProductsRepository.findOne(
                {
                  where: { results_id: resultId },
                },
              );
              if (kp) {
                kpExtra = {
                  knowledge_product_id: kp.result_knowledge_product_id,
                  knowledge_product_handle: kp.handle,
                };
              }
            }

            createdResults.push({
              id: resultId,
              result_code: newResultHeader.result_code,
              is_duplicate_kp: false,
              ...kpExtra,
            });

            resultInfo = await this._resultRepository.findOne({
              where: { id: newResultHeader.id },
              relations: {
                obj_geographic_scope: true,
                obj_result_type: true,
                obj_result_level: true,
                obj_created: true,
                obj_external_submitter: true,
                result_region_array: {
                  region_object: true,
                },
                result_country_array: {
                  country_object: true,
                  result_countries_subnational_array: true,
                },
                result_by_institution_array: {
                  obj_institutions: {
                    obj_institution_type_code: true,
                  },
                },
                result_center_array: {
                  clarisa_center_object: {
                    clarisa_institution: true,
                  },
                },
                obj_results_toc_result: true,
                obj_result_by_project: {
                  obj_clarisa_project: true,
                },
                ...(isKpType && {
                  result_knowledge_product_array: {
                    result_knowledge_product_keyword_array: true,
                    result_knowledge_product_metadata_array: true,
                  },
                }),
                ...(isCapacityChange && {
                  results_capacity_development_object: true,
                }),
                ...(isInnovationDev && {
                  results_innovations_dev_object: true,
                }),
                ...(isInnovationUse && {
                  results_innovations_use_object: true,
                }),
                ...(isPolicyChange && {
                  results_policy_changes_object: true,
                }),
              },
            });

            this.logger.log(
              `Successfully created bilateral result ${resultId} (code: ${newResultHeader.result_code})`,
            );
          },
        );
      } catch (error) {
        this.logger.error('Error creating bilateral', error);
        this.logger.error(error.stack);
        throw error;
      }
    }

    return {
      response: resultInfo,
      message: 'Results Bilateral created successfully.',
      status: 201,
    };
  }

  private unwrapIncomingResults(
    rootResultsDto: RootResultsDto,
  ): ResultBilateralDto[] {
    if (!rootResultsDto) {
      return [];
    }

    if (
      Array.isArray(rootResultsDto.results) &&
      rootResultsDto.results.length > 0
    ) {
      return rootResultsDto.results;
    }

    if (rootResultsDto.result) {
      return [rootResultsDto.result];
    }

    if (
      rootResultsDto.data &&
      typeof rootResultsDto.data === 'object' &&
      Object.keys(rootResultsDto.data).length > 0
    ) {
      return [
        {
          type: rootResultsDto.type ?? 'BILATERAL',
          data: rootResultsDto.data,
        },
      ];
    }

    return [];
  }

  private async findOrCreateUser(userData, adminUser): Promise<any> {
    if (!userData?.email) {
      throw new BadRequestException('User email is required.');
    }

    const user = await this._userRepository.findOne({
      where: { email: userData.email },
    });

    if (!user) {
      const emailDomain = (userData.email.split('@')[1] || '').toLowerCase();
      const isCgiar = /cgiar/.test(emailDomain);
      const createUserDto: CreateUserDto = {
        first_name: userData.name ?? '(no name)',
        last_name: '(external)',
        email: userData.email,
        is_cgiar: isCgiar,
        created_by: adminUser?.id,
      };

      this.logger.log(`Creating new user for email: ${createUserDto.email}`);
      try {
        const createdUserWrapper = await this._userService.createFull(
          createUserDto,
          adminUser?.id,
        );

        let createdUser: any = createdUserWrapper;
        if (
          createdUserWrapper &&
          typeof createdUserWrapper === 'object' &&
          'response' in createdUserWrapper &&
          createdUserWrapper.response
        ) {
          createdUser = createdUserWrapper.response;
        }

        if (!createdUser?.id) {
          throw new Error(
            `User creation failed: createFull did not return a valid user object for email=${createUserDto.email}`,
          );
        }

        this.logger.debug(
          `Created user unwrapped: ${JSON.stringify({ id: createdUser.id, email: createUserDto.email })}`,
        );
        return createdUser;
      } catch (error) {
        this.logger.error(
          `Failed to create user for email ${createUserDto.email}:`,
          error instanceof Error ? error.stack : JSON.stringify(error),
        );
        throw new BadRequestException(
          `Unable to create user account for ${createUserDto.email}. Please contact support.`,
        );
      }
    }

    this.logger.debug(
      `Found existing user: ${JSON.stringify({ id: user.id, email: user.email })}`,
    );
    return user;
  }

  private async handleTocMapping(
    toc,
    contributingPrograms: any[],
    userId,
    resultId,
  ) {
    if (!toc || typeof toc !== 'object') {
      this.logger.warn(
        'handleTocMapping received invalid toc object; skipping',
      );
      return;
    }

    const mappings: Array<
      {
        science_program_id?: string;
        aow_compose_code?: string;
        result_title?: string;
        result_indicator_description?: string;
        result_indicator_type_name?: string;
      } & { roleId: number }
    > = [];

    mappings.push({ ...toc, roleId: 1 });

    if (Array.isArray(contributingPrograms)) {
      contributingPrograms.forEach((contrib) =>
        mappings.push({ ...contrib, roleId: 2 }),
      );
    }

    for (const mapping of mappings) {
      const {
        science_program_id,
        aow_compose_code,
        result_title,
        result_indicator_description,
        result_indicator_type_name,
        roleId,
      } = mapping;

      const missingFields = [
        !science_program_id && 'science_program_id',
        science_program_id &&
        !aow_compose_code &&
        !result_title &&
        !result_indicator_description &&
        !result_indicator_type_name
          ? null
          : !aow_compose_code && 'aow_compose_code',
        science_program_id &&
        !aow_compose_code &&
        !result_title &&
        !result_indicator_description &&
        !result_indicator_type_name
          ? null
          : !result_title && 'result_title',
        science_program_id &&
        !aow_compose_code &&
        !result_title &&
        !result_indicator_description &&
        !result_indicator_type_name
          ? null
          : !result_indicator_description && 'result_indicator_description',
        science_program_id &&
        !aow_compose_code &&
        !result_title &&
        !result_indicator_description &&
        !result_indicator_type_name
          ? null
          : !result_indicator_type_name && 'result_indicator_type_name',
      ].filter(Boolean) as string[];

      if (missingFields.length) {
        this.logger.warn(
          `TOC mapping missing required fields: ${missingFields.join(', ')} (role ${roleId})`,
        );
        continue;
      }

      try {
        const mapToToc =
          await this._resultsTocResultsRepository.findTocResultsForBilateral(
            mapping,
          );

        if (!mapToToc || !Array.isArray(mapToToc) || !mapToToc.length) {
          this.logger.warn(
            `TOC mapping did not match any ToC results (compose=${aow_compose_code}, program=${science_program_id})`,
          );
          continue;
        }

        const firstMap = mapToToc[0];
        const isInitiativeOnlyMapping =
          firstMap.toc_result_id === null &&
          firstMap.toc_results_indicator_id === null &&
          firstMap.science_program_id;

        if (
          !isInitiativeOnlyMapping &&
          (!firstMap.toc_result_id || !firstMap.toc_results_indicator_id)
        ) {
          this.logger.warn(
            'TOC mapping repository data missing fields: toc_result_id or toc_results_indicator_id',
          );
          continue;
        }

        const categoryToLevelMap = {
          OUTPUT: 1,
          OUTCOME: 2,
          EOI: 3,
        };

        const tocLevelId = firstMap.category
          ? categoryToLevelMap[firstMap.category.toUpperCase()]
          : null;

        if (firstMap.category && !tocLevelId) {
          this.logger.warn(
            `TOC mapping has invalid category: ${firstMap.category}`,
          );
        }

        const init = await this._clarisaInitiatives.findOne({
          where: { official_code: science_program_id },
        });

        if (!init) {
          this.logger.warn(
            `TOC mapping initiative not found for official_code=${science_program_id}`,
          );
          continue;
        }

        await this.upsertResultInitiative(resultId, init.id, roleId, userId);

        const existingToc = await this._resultsTocResultsRepository.findOneBy({
          result_id: resultId,
          initiative_id: init.id,
          toc_result_id: firstMap.toc_result_id ?? null,
          is_active: true,
        });

        const tocMapping =
          existingToc ??
          (await this._resultsTocResultsRepository.save({
            created_by: userId,
            toc_result_id: firstMap.toc_result_id,
            initiative_id: init.id,
            result_id: resultId,
            toc_level_id: tocLevelId,
          }));

        if (!isInitiativeOnlyMapping) {
          const existingIndicator =
            await this._resultsTocResultsIndicatorsRepository.findOne({
              where: {
                results_toc_results_id: tocMapping.result_toc_result_id,
                toc_results_indicator_id: firstMap.toc_results_indicator_id,
              },
            });

          const indicatorRecord =
            existingIndicator ??
            (await this._resultsTocResultsIndicatorsRepository.save({
              created_by: userId,
              results_toc_results_id: tocMapping.result_toc_result_id,
              toc_results_indicator_id: firstMap.toc_results_indicator_id,
            }));

          if (firstMap.number_target) {
            const targetDate = firstMap.target_date
              ? Number(firstMap.target_date)
              : null;

            const existingTarget =
              await this._resultsTocTargetIndicatorRepository.findOne({
                where: {
                  result_toc_result_indicator_id:
                    indicatorRecord.result_toc_result_indicator_id,
                  number_target: firstMap.number_target,
                },
              });

            if (!existingTarget) {
              await this._resultsTocTargetIndicatorRepository.save({
                number_target: firstMap.number_target,
                result_toc_result_indicator_id:
                  indicatorRecord.result_toc_result_indicator_id,
                contributing_indicator: 1,
                target_date: targetDate,
                created_by: userId,
                last_updated_by: userId,
                is_active: true,
              });
            }
          }
        }

        this.logger.debug(
          `TOC mapping processed successfully for program ${science_program_id} (role ${roleId})`,
        );
      } catch (err) {
        this.logger.error(
          `TOC mapping unexpected error for program ${mapping.science_program_id}: ${
            (err as Error).message
          }`,
        );
      }
    }
  }

  private async handleNonPooledProject(
    resultId: number,
    userId: number,
    bilateralProjects: any[],
  ) {
    if (
      !bilateralProjects ||
      !Array.isArray(bilateralProjects) ||
      !bilateralProjects.length
    ) {
      return;
    }
    for (const nonpp of bilateralProjects) {
      if (!nonpp?.grant_title) continue;

      const project = await this._clarisaProjectsRepository.findOne({
        where: [
          { shortName: nonpp.grant_title },
          { fullName: nonpp.grant_title },
        ],
      });

      if (!project) {
        this.logger.warn(
          `Project not found for grant_title: ${nonpp.grant_title}`,
        );
        continue;
      }

      await this._resultsByProjectsRepository.save({
        result_id: resultId,
        project_id: project.id,
        created_by: userId,
      });
    }
  }

  private async initializeResultHeader({
    bilateralDto,
    userId,
    submittedUserId,
    version,
    year,
    lastCode,
  }: {
    bilateralDto: CreateBilateralDto;
    userId: number;
    submittedUserId: number;
    version: any;
    year: any;
    lastCode: number;
  }): Promise<Result> {
    const handler = this.resultTypeHandlerMap.get(bilateralDto.result_type_id);
    if (handler?.initializeResultHeader) {
      const custom = await handler.initializeResultHeader({
        bilateralDto,
        userId,
        submittedUserId,
        version,
        year,
        lastCode,
      });
      if (custom?.resultHeader) return custom.resultHeader;
    }

    const resultHeader = await this._resultRepository.save({
      created_by: userId,
      version_id: version.id,
      title: bilateralDto.title,
      description: bilateralDto.description,
      reported_year_id: year.year,
      result_code: lastCode + 1,
      result_type_id: bilateralDto.result_type_id,
      result_level_id: bilateralDto.result_level_id,
      external_submitter: submittedUserId,
      external_submitted_date:
        bilateralDto.submitted_by?.submitted_date ?? null,
      external_submitted_comment: bilateralDto.submitted_by?.comment ?? null,
      ...(bilateralDto.created_date && {
        created_date: bilateralDto.created_date,
      }),
      source: SourceEnum.Bilateral,
    });

    return resultHeader;
  }

  private async runResultTypeHandlers(context: {
    resultId: number;
    userId: number;
    bilateralDto: CreateBilateralDto;
    isDuplicateResult: boolean;
  }) {
    const handler = this.resultTypeHandlerMap.get(
      context.bilateralDto.result_type_id,
    );
    if (!handler?.afterCreate) return;
    await handler.afterCreate({
      resultId: context.resultId,
      userId: context.userId,
      bilateralDto: context.bilateralDto,
      isDuplicateResult: context.isDuplicateResult,
    });
  }

  private async ensureUniqueTitle(title: string) {
    const normalizedTitle = (title || '').trim();
    if (!normalizedTitle) {
      throw new BadRequestException('Result title is required.');
    }

    const existing = await this._resultRepository.findOne({
      where: { title: normalizedTitle, is_active: true },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        `A result with the title "${normalizedTitle}" already exists.`,
      );
    }
  }

  private async handleLeadCenter(
    resultId: number,
    leadCenter: { name?: string; acronym?: string; institution_id?: number },
    userId: number,
  ) {
    if (!leadCenter || typeof leadCenter !== 'object') {
      this.logger.debug(
        'No lead_center object; skipping results_center creation',
      );
      return;
    }

    const { name, acronym, institution_id } = leadCenter;
    if (!name && !acronym && !institution_id) {
      this.logger.warn(
        'lead_center must include at least one of name, acronym, institution_id',
      );
      return;
    }

    const institutionCandidates = [];

    if (institution_id) {
      const inst = await this._clarisaInstitutionsRepository.findOne({
        where: { id: institution_id },
      });
      if (inst) institutionCandidates.push(inst);
      else
        this.logger.warn(
          `No institution found for institution_id=${institution_id}`,
        );
    }

    const fuzzyConditions = [];
    if (name) fuzzyConditions.push({ name: Like(`%${name}%`) });
    if (acronym) fuzzyConditions.push({ acronym: Like(`%${acronym}%`) });
    if (fuzzyConditions.length) {
      const fuzzy = await this._clarisaInstitutionsRepository.find({
        where: fuzzyConditions,
      });
      for (const f of fuzzy) {
        if (!institutionCandidates.find((c) => c.id === f.id)) {
          institutionCandidates.push(f);
        }
      }
    }

    if (!institutionCandidates.length) {
      this.logger.warn(
        `No institutions matched lead_center input (name='${name || ''}', acronym='${acronym || ''}', institution_id='${institution_id || ''}')`,
      );
      return;
    }

    let selectedCenter: ClarisaCenter | null = null;
    for (const inst of institutionCandidates) {
      const centers = await this._clarisaCenters.find({
        where: { institutionId: inst.id },
      });
      if (centers && centers.length) {
        selectedCenter = centers[0];
        break;
      }
    }

    if (!selectedCenter) {
      this.logger.warn(
        'Institutions matched but none have associated clarisa_center records',
      );
      return;
    }

    try {
      const existing =
        await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
          resultId,
          selectedCenter.code,
        );
      if (existing) {
        await this._resultRepository.query(
          `update results_center set is_primary = 1, is_leading_result = 1, last_updated_date = NOW(), last_updated_by = ? where id = ?`,
          [userId, existing.id],
        );
        this.logger.debug(
          `Updated existing lead center flags (center=${selectedCenter.code}, result=${resultId})`,
        );
        return;
      }
      await this._resultsCenterRepository.save({
        result_id: resultId,
        center_id: selectedCenter.code,
        is_primary: true,
        is_leading_result: true,
        from_cgspace: false,
        is_active: true,
        created_by: userId,
      });
      this.logger.log(
        `Lead center stored for result ${resultId}: center_id=${selectedCenter.code}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to save lead center for result ${resultId}: ${selectedCenter.code}`,
        err instanceof Error ? err.stack : JSON.stringify(err),
      );
    }
  }

  /**
   * Stores contributing centers (non lead) into results_center.
   * Input objects follow InstitutionDto shape: may include institution_id, acronym, or name.
   * Avoids duplicating the lead center if already stored.
   */
  private async handleContributingCenters(
    resultId: number,
    centers: { name?: string; acronym?: string; institution_id?: number }[],
    userId: number,
    leadCenter?: { name?: string; acronym?: string; institution_id?: number },
  ) {
    if (!Array.isArray(centers) || !centers.length) return;

    for (const centerInput of centers) {
      if (!centerInput) continue;
      const { name, acronym, institution_id } = centerInput;
      if (!name && !acronym && !institution_id) continue;

      if (
        leadCenter &&
        ((leadCenter.institution_id &&
          institution_id &&
          leadCenter.institution_id === institution_id) ||
          (leadCenter.acronym &&
            acronym &&
            leadCenter.acronym.toLowerCase() === acronym.toLowerCase()) ||
          (leadCenter.name &&
            name &&
            leadCenter.name.toLowerCase() === name.toLowerCase()))
      ) {
        continue;
      }

      const institutionCandidates = [];
      if (institution_id) {
        const inst = await this._clarisaInstitutionsRepository.findOne({
          where: { id: institution_id },
        });
        if (inst) institutionCandidates.push(inst);
      }
      const fuzzyConditions = [];
      if (name) fuzzyConditions.push({ name: Like(`%${name}%`) });
      if (acronym) fuzzyConditions.push({ acronym: Like(`%${acronym}%`) });
      if (!institution_id && fuzzyConditions.length) {
        const fuzzy = await this._clarisaInstitutionsRepository.find({
          where: fuzzyConditions,
        });
        for (const f of fuzzy) {
          if (!institutionCandidates.find((c) => c.id === f.id)) {
            institutionCandidates.push(f);
          }
        }
      }
      if (!institutionCandidates.length) continue;

      let selectedCenter: ClarisaCenter = null;
      for (const inst of institutionCandidates) {
        const centersFound = await this._clarisaCenters.find({
          where: { institutionId: inst.id },
        });
        if (centersFound?.length) {
          selectedCenter = centersFound[0];
          break;
        }
      }
      if (!selectedCenter) continue;

      const existing =
        await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
          resultId,
          selectedCenter.code,
        );
      if (existing) continue;

      try {
        await this._resultsCenterRepository.save({
          result_id: resultId,
          center_id: selectedCenter.code,
          is_primary: false,
          is_leading_result: false,
          from_cgspace: false,
          is_active: true,
          created_by: userId,
        });
      } catch (err) {
        this.logger.error(
          `Failed to save contributing center ${selectedCenter.code} for result ${resultId}`,
          err instanceof Error ? err.stack : JSON.stringify(err),
        );
      }
    }
  }

  private async upsertResultInitiative(
    resultId: number,
    initiativeId: number,
    roleId: number,
    userId: number,
  ) {
    const existing = await this._resultByInitiativesRepository.findOne({
      where: { result_id: resultId, initiative_id: initiativeId },
    });

    if (existing) {
      await this._resultByInitiativesRepository.update(
        { id: existing.id },
        {
          initiative_role_id: roleId,
          is_active: true,
          last_updated_by: userId,
          last_updated_date: new Date(),
        },
      );
      return;
    }

    await this._resultByInitiativesRepository.save({
      result_id: resultId,
      initiative_id: initiativeId,
      initiative_role_id: roleId,
      is_active: true,
      created_by: userId,
      last_updated_by: userId,
    });
  }

  private async handleEvidence(resultId, evidence, userId) {
    const evidencesArray = evidence.filter((e) => !!e?.link);
    const testDuplicate = evidencesArray.map((e) => e.link);
    if (new Set(testDuplicate).size !== testDuplicate.length) {
      throw {
        response: {},
        message: 'Duplicate links found in the evidence',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    const long: number = evidencesArray.length > 6 ? 6 : evidencesArray.length;
    for (let index = 0; index < long; index++) {
      const evidence = evidencesArray[index];

      evidence.link = await this._evidencesService.getHandleFromRegularLink(
        evidence.link,
      );

      const newEvidence = new Evidence();
      newEvidence.created_by = userId;
      newEvidence.description = evidence?.description ?? null;
      newEvidence.link = evidence.link;
      newEvidence.result_id = resultId;

      const hasQuery = (evidence.link ?? '').indexOf('?');
      const linkSplit = (evidence.link ?? '')
        .slice(0, hasQuery != -1 ? hasQuery : evidence.link?.length)
        .split('/');
      const handleId = linkSplit.slice(linkSplit.length - 2).join('/');

      const knowledgeProduct =
        await this._resultsKnowledgeProductsRepository.findOne({
          where: { handle: Like(handleId) },
          relations: { result_object: true },
        });

      if (knowledgeProduct) {
        newEvidence.knowledge_product_related =
          knowledgeProduct.result_object.id;
      }

      await this._evidencesRepository.save(newEvidence);
    }
  }

  private async handleInstitutions(resultId, institutions, userId) {
    if (!Array.isArray(institutions) || !institutions.length) return;

    const resolvedInstitutionIds: number[] = [];

    for (const input of institutions) {
      if (!input) continue;
      const { institution_id, name, acronym } = input;
      let matched: ClarisaInstitution | null = null;

      if (institution_id) {
        matched = await this._clarisaInstitutionsRepository.findOne({
          where: { id: institution_id },
        });
      }

      if (!matched && (name || acronym)) {
        const fuzzyConds = [];
        if (name) fuzzyConds.push({ name: Like(`%${name}%`) });
        if (acronym) fuzzyConds.push({ acronym: Like(`%${acronym}%`) });
        if (fuzzyConds.length) {
          const fuzzy = await this._clarisaInstitutionsRepository.find({
            where: fuzzyConds,
          });
          if (fuzzy?.length) matched = fuzzy[0];
        }
      }

      if (matched && !resolvedInstitutionIds.includes(matched.id)) {
        resolvedInstitutionIds.push(matched.id);
      }
    }

    if (!resolvedInstitutionIds.length) {
      this.logger.warn(
        'handleInstitutions: no institutions resolved from provided partners; skipping.',
      );
      return;
    }

    const mappedInstitutions = resolvedInstitutionIds.map((id) => ({
      institutions_id: id,
    }));

    await this._resultByIntitutionsRepository.updateInstitutions(
      resultId,
      mappedInstitutions,
      userId,
      false,
      [InstitutionRoleEnum.PARTNER],
    );

    const toPersist: ResultsByInstitution[] = [];
    for (const instId of resolvedInstitutionIds) {
      const exists =
        await this._resultByIntitutionsRepository.getResultByInstitutionExists(
          resultId,
          instId,
          InstitutionRoleEnum.PARTNER,
        );
      if (!exists) {
        const newPartner = new ResultsByInstitution();
        newPartner.created_by = userId;
        newPartner.last_updated_by = userId;
        newPartner.result_id = resultId;
        newPartner.institution_roles_id = InstitutionRoleEnum.PARTNER;
        newPartner.institutions_id = instId;
        newPartner.is_active = true;
        toPersist.push(newPartner);
      }
    }

    if (toPersist.length) {
      await this._resultByIntitutionsRepository.save(toPersist);
    }
  }

  private async findScope(scope_code?: number, scope_label?: string) {
    const where = scope_code ? { id: scope_code } : { name: scope_label };
    const scope = await this._geoScopeRepository.findOne({ where });
    if (!scope) {
      throw new NotFoundException(
        `No geographic scope found for ${scope_code ? `code ${scope_code}` : `label "${scope_label}"`}`,
      );
    }
    return scope;
  }

  private validateGeoFocus(scope, regions, countries, subnational_areas) {
    const label = scope.name;

    const validators = {
      2: {
        field: regions,
        message: `Regions are required for scope "${label}".`,
      },
      4: {
        field: countries,
        message: `Countries are required for scope "${label}".`,
      },
      5: {
        field: countries?.length && subnational_areas?.length,
        message: `Countries and subnational areas are required for scope "${label}".`,
      },
    };

    const validator = validators[scope.code];
    if (validator && !validator.field)
      throw new BadRequestException(validator.message);
  }

  private async handleRegions(result: Result, scope, regions) {
    const hasRegions = Array.isArray(regions) && regions.length > 0;
    if ((!hasRegions && scope.id !== 2) || scope.id === 3 || scope.id === 4) {
      await this._resultRegionRepository.updateRegions(result.id, []);
      result.has_regions = false;
      return;
    }

    const um49codes = regions
      .map((r) => r.um49code)
      .filter((code) => code !== null && code !== undefined);
    const names = regions
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);

    const whereConditions = [
      ...(um49codes.length ? [{ um49Code: In(um49codes) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one region identifier (um49code or name) must be provided.',
      );
    }

    const foundRegions = await this._clarisaRegionsRepository.find({
      where: whereConditions,
    });

    if (!foundRegions.length) {
      throw new NotFoundException(
        `No regions found matching the provided data (codes: ${um49codes.join(', ') || 'N/A'}, names: ${names.join(', ') || 'N/A'}).`,
      );
    }

    const regionIds = foundRegions.map((r) => r.um49Code);

    await this._resultRegionRepository.updateRegions(result.id, regionIds);
    const resultRegionArray: ResultRegion[] = [];
    for (const region of foundRegions) {
      const exist =
        await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(
          result.id,
          region.um49Code,
        );

      if (!exist) {
        const newRegion = new ResultRegion();
        newRegion.region_id = region.um49Code;
        newRegion.result_id = result.id;
        resultRegionArray.push(newRegion);
      }
    }

    if (resultRegionArray.length) {
      await this._resultRegionRepository.save(resultRegionArray);
    }

    result.has_regions = true;
    result.geographic_scope_id = scope.id === 50 ? 50 : scope.id;

    await this._resultRepository.save(result);
  }

  private resolveScopeId(scopeId: number, countries?: any[]) {
    if (scopeId === 50) return 50;
    if (scopeId === 3 && countries) return countries.length > 1 ? 3 : 4;
    return scopeId;
  }

  private async handleCountries(
    result,
    countries,
    subnational_areas,
    scopeId,
    userId,
  ) {
    const hasCountries = Array.isArray(countries) && countries.length > 0;

    if (!hasCountries) {
      if (scopeId !== 3) {
        await this._resultCountryRepository.updateCountries(result.id, []);
      }
      result.has_countries = false;
      return;
    }

    const ids = countries
      .map((r) => r.id)
      .filter((id) => id !== null && id !== undefined);
    const names = countries
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);
    const isoAlpha3s = countries
      .map((r) => r.iso_alpha_3)
      .filter((code) => code !== null && code !== undefined);
    const isoAlpha2s = countries
      .map((r) => r.iso_alpha_2)
      .filter((code) => code !== null && code !== undefined);

    const whereConditions = [
      ...(ids.length ? [{ id: In(ids) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
      ...(isoAlpha3s.length ? [{ iso_alpha_3: In(isoAlpha3s) }] : []),
      ...(isoAlpha2s.length ? [{ iso_alpha_2: In(isoAlpha2s) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one country identifier (id, name, iso_alpha_3, or iso_alpha_2) must be provided.',
      );
    }

    const foundCountries = await this._clarisaCountriesRepository.find({
      where: whereConditions,
    });

    if (!foundCountries.length) {
      throw new NotFoundException(
        `No countries found matching any of the provided identifiers: ids=${ids.join(', ') || 'N/A'}, names=${names.join(', ') || 'N/A'}.`,
      );
    }

    const foundCountryIds = foundCountries.map((c) => c.id);

    await this._resultCountryRepository.updateCountries(
      result.id,
      foundCountryIds,
    );

    const resultCountryArray = await this.handleResultCountryArray(
      result,
      foundCountries,
    );
    await this.handleSubnationals(
      resultCountryArray,
      subnational_areas,
      scopeId,
      userId,
    );

    result.has_countries = true;
  }

  private async handleResultCountryArray(result, countries) {
    const resultCountryArray: ResultCountry[] = [];

    for (const c of countries) {
      const exist =
        await this._resultCountryRepository.getResultCountrieByIdResultAndCountryId(
          result.id,
          c.id,
        );
      if (!exist) {
        const newCountry = new ResultCountry();
        newCountry.country_id = c.id;
        newCountry.result_id = result.id;
        resultCountryArray.push(newCountry);
      }
    }

    if (resultCountryArray.length) {
      await this._resultCountryRepository.save(resultCountryArray);
    }

    return resultCountryArray;
  }

  private async handleSubnationals(
    resultCountryArray,
    subnational_areas,
    geoScopeId,
    userId,
  ) {
    if (geoScopeId !== 5) return;

    const ids = subnational_areas
      .map((r) => r.id)
      .filter((id) => id !== null && id !== undefined);
    const names = subnational_areas
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);

    const whereConditions = [
      ...(ids.length ? [{ id: In(ids) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one subnational area identifier (id or name) must be provided.',
      );
    }

    const foundSubnationalAreas =
      await this._clarisaSubnationalAreasRepository.find({
        where: whereConditions,
      });

    if (!foundSubnationalAreas.length) {
      throw new NotFoundException(
        `No subnational areas found matching any of the provided identifiers: ids=${ids.join(', ') || 'N/A'}, names=${names.join(', ') || 'N/A'}.`,
      );
    }

    const foundCountryIds = foundSubnationalAreas.map((c) => c.code);

    await Promise.all(
      resultCountryArray.map(async (rc) => {
        await Promise.all([
          this._resultCountrySubnationalRepository.bulkUpdateSubnational(
            rc.result_country_id,
            foundCountryIds,
            userId,
          ),
          this._resultCountrySubnationalRepository.upsertSubnational(
            rc.result_country_id,
            foundCountryIds,
            userId,
          ),
        ]);
      }),
    );
  }
}
