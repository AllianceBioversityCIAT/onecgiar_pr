import {
  Injectable,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { RootResultsDto, SubmittedByDto } from './dto/create-bilateral.dto';
import { ResultRepository } from '../results/result.repository';
import { VersioningService } from '../versioning/versioning.service';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { HandlersError } from '../../shared/handlers/error.utils';
import { Result, SourceEnum } from '../results/entities/result.entity';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ClarisaRegionsRepository } from '../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { Between, In, Like } from 'typeorm';
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
import { ResultsKnowledgeProductMetadataRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { ClarisaCentersRepository } from '../../clarisa/clarisa-centers/clarisa-centers.repository';
import { NonPooledProjectRepository } from '../results/non-pooled-projects/non-pooled-projects.repository';
import { UserService } from '../../auth/modules/user/user.service';
import { CreateUserDto } from '../../auth/modules/user/dto/create-user.dto';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ClarisaCenter } from '../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaInstitution } from '../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';

@Injectable()
export class BilateralService {
  constructor(
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
    private readonly _resultsKnowledgeProductMetadataRepository: ResultsKnowledgeProductMetadataRepository,
    private readonly _clarisaCenters: ClarisaCentersRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _userService: UserService,
    private readonly _resultsTocResultsRepository: ResultsTocResultRepository,
    private readonly _clarisaInitiatives: ClarisaInitiativesRepository,
    private readonly _resultsTocResultsIndicatorsRepository: ResultsTocResultIndicatorsRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
  ) {}

  private readonly logger = new Logger(BilateralService.name);

  async create(rootResultsDto: RootResultsDto) {
    if (
      !rootResultsDto?.results ||
      !Array.isArray(rootResultsDto.results) ||
      rootResultsDto.results.length === 0
    ) {
      throw new BadRequestException(
        'The "results" array is required and cannot be empty.',
      );
    }
    try {
      const createdResults = [];
      let resultInfo: any = null;
      for (const result of rootResultsDto.results) {
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

        let newResultHeader: Result;
        let resultId: number;

        let isDuplicateKp = false;
        if (bilateralDto.result_type_id === 6) {
          this.logger.log('Direct KP creation (no CGSpace sync)');
          const existingKp =
            await this._resultsKnowledgeProductsRepository.findOne({
              where: {
                handle: Like(bilateralDto.knowledge_product.handle),
                result_object: { is_active: true },
              },
              relations: { result_object: true },
            });
          if (existingKp) {
            this.logger.warn(
              `Knowledge Product with handle ${bilateralDto.knowledge_product.handle} already exists (result_id=${existingKp.result_object.id}), skipping KP creation for this entry.`,
            );
            newResultHeader = existingKp.result_object;
            resultId = newResultHeader.id;
            isDuplicateKp = true;
          } else {
            newResultHeader = await this._resultRepository.save({
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
              external_submitted_comment:
                bilateralDto.submitted_by?.comment ?? null,
              ...(bilateralDto.created_date && {
                created_date: bilateralDto.created_date,
              }),
              source: SourceEnum.Bilateral,
            });
            resultId = newResultHeader.id;

            const kpEntity: any = {
              results_id: resultId,
              created_by: userId,
              handle: bilateralDto.knowledge_product.handle,
              name: bilateralDto.title,
              description: bilateralDto.description,
              knowledge_product_type:
                bilateralDto.knowledge_product.knowledge_product_type,
              licence: bilateralDto.knowledge_product.licence,
              is_active: true,
            };
            const savedKp =
              await this._resultsKnowledgeProductsRepository.save(kpEntity);

            if (bilateralDto.knowledge_product.metadataCG) {
              const meta = bilateralDto.knowledge_product.metadataCG;
              await this._resultsKnowledgeProductMetadataRepository.save({
                result_knowledge_product_id:
                  savedKp.result_knowledge_product_id,
                source: meta.source,
                is_isi: meta.is_isi ?? null,
                accesibility: meta.accessibility ? 'Open' : 'Restricted',
                year: meta.issue_year ?? null,
                online_year: meta.issue_year ?? null,
                is_peer_reviewed: meta.is_peer_reviewed ?? null,
                doi: null,
                created_by: userId,
                is_active: true,
              });
            }
          }
        } else {
          newResultHeader = await this._resultRepository.save({
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
            external_submitted_comment:
              bilateralDto.submitted_by?.comment ?? null,
            ...(bilateralDto.created_date && {
              created_date: bilateralDto.created_date,
            }),
            source: SourceEnum.Bilateral,
          });
          resultId = newResultHeader.id;
        }

        // === Ancillary handlers skipped if KP already existed to avoid duplicate inserts ===
        if (!isDuplicateKp) {
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
        } else {
          this.logger.debug(
            `Skipping TOC, institutions, evidence and NPP handlers for duplicate KP handle='${bilateralDto.knowledge_product.handle}' (result_id=${resultId}).`,
          );
        }

        await this.handleContributingCenters(
          resultId,
          bilateralDto.contributing_center || [],
          userId,
          bilateralDto.lead_center,
        );

        let kpExtra: any = {};
        if (bilateralDto.result_type_id === 6) {
          const kp = await this._resultsKnowledgeProductsRepository.findOne({
            where: { results_id: resultId },
          });
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
          is_duplicate_kp: isDuplicateKp,
          ...kpExtra,
        });

        const isKpType = bilateralDto.result_type_id === 6;
        resultInfo = await this._resultRepository.findOne({
          where: { id: newResultHeader.id },
          relations: {
            obj_geographic_scope: true,
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
            ...(isKpType && {
              result_knowledge_product_array: {
                result_knowledge_product_keyword_array: true,
                result_knowledge_product_metadata_array: true,
              },
            }),
          },
        });
      }

      return {
        response: resultInfo,
        message: 'Results Bilateral created successfully.',
        status: 201,
      };
    } catch (error) {
      this.logger.error(
        'Error creating bilateral',
        error instanceof Error ? error.stack : JSON.stringify(error),
      );
      throw error;
    }
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
        this.logger.warn(
          `createFull did not return expected user object for email=${createUserDto.email}`,
        );
      }
      this.logger.debug(
        `Created user unwrapped: ${JSON.stringify({ id: createdUser?.id ?? null, email: createUserDto.email })}`,
      );
      return createdUser;
    }

    return user;
  }

  private async handleTocMapping(tocArray, userId, resultId) {
    if (!Array.isArray(tocArray)) {
      this.logger.warn(
        'handleTocMapping received non-array tocArray; skipping',
      );
      return;
    }

    const errors: string[] = [];
    let processed = 0;

    for (const [index, toc] of tocArray.entries()) {
      const {
        science_program_id,
        aow_compose_code,
        result_title,
        result_indicator_description,
        result_indicator_type_name,
      } = toc || {};

      const missingFields = [
        !science_program_id && 'science_program_id',
        !aow_compose_code && 'aow_compose_code',
        !result_title && 'result_title',
        !result_indicator_description && 'result_indicator_description',
        !result_indicator_type_name && 'result_indicator_type_name',
      ].filter(Boolean) as string[];

      if (missingFields.length) {
        errors.push(
          `TOC item ${index} missing required fields: ${missingFields.join(', ')}`,
        );
        continue;
      }

      try {
        const mapToToc =
          await this._resultsTocResultsRepository.findTocResultsForBilateral(
            toc,
          );

        if (!mapToToc || !Array.isArray(mapToToc) || !mapToToc.length) {
          errors.push(
            `TOC item ${index} did not match any ToC results (compose=${aow_compose_code}, program=${science_program_id})`,
          );
          continue;
        }

        const firstMap = mapToToc[0];
        if (!firstMap.toc_result_id || !firstMap.toc_results_indicator_id) {
          errors.push(
            `TOC item ${index} repository data missing fields: toc_result_id or toc_results_indicator_id`,
          );
          continue;
        }

        const init = await this._clarisaInitiatives.findOne({
          where: { official_code: science_program_id },
        });

        if (!init) {
          errors.push(
            `TOC item ${index} initiative not found for official_code=${science_program_id}`,
          );
          continue;
        }

        const newTocMapping = this._resultsTocResultsRepository.create({
          created_by: userId,
          toc_result_id: firstMap.toc_result_id,
          initiative_id: init.id,
          result_id: resultId,
        });
        await this._resultsTocResultsRepository.save(newTocMapping);

        const newTocContributorsIndicator =
          this._resultsTocResultsIndicatorsRepository.create({
            created_by: userId,
            results_toc_results_id: newTocMapping.result_toc_result_id,
            toc_results_indicator_id: firstMap.toc_results_indicator_id,
          });
        await this._resultsTocResultsIndicatorsRepository.save(
          newTocContributorsIndicator,
        );
        processed++;
      } catch (err) {
        errors.push(
          `TOC item ${index} unexpected error: ${(err as Error).message}`,
        );
      }
    }

    if (errors.length) {
      this.logger.warn(
        `handleTocMapping completed with ${processed} items processed and ${errors.length} issues: ${errors.join(' | ')}`,
      );
    } else {
      this.logger.debug(
        `handleTocMapping processed ${processed} TOC items successfully`,
      );
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
      await this._nonPooledProjectRepository.save({
        results_id: resultId,
        grant_title: nonpp.grant_title,
        funder_institution_id: null,
        created_by: userId,
      });
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
        newPartner.institution_roles_id = InstitutionRoleEnum.PARTNER; // 2
        newPartner.institutions_id = instId;
        newPartner.is_active = true;
        toPersist.push(newPartner);
      }
    }

    if (toPersist.length) {
      await this._resultByIntitutionsRepository.save(toPersist);
    }
  }

  private async findSubmittedByUser({
    email,
    submitted_date,
    name,
  }: SubmittedByDto) {
    if (email) return this._userRepository.findOne({ where: { email } });

    if (submitted_date) {
      const start = new Date(submitted_date);
      const end = new Date(submitted_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      return this._userRepository.findOne({
        where: { created_date: Between(start, end) },
      });
    }

    if (name) {
      const [firstName, ...lastParts] = name.trim().split(/\s+/);
      const lastName = lastParts.join(' ') || null;
      const where: any[] = [{ first_name: firstName }];

      if (lastName) {
        where.push(
          { last_name: lastName },
          { first_name: firstName, last_name: lastName },
        );
      }

      return this._userRepository.findOne({ where });
    }

    return null;
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
    result.geographic_scope_id = [4, 50].includes(scope.id) ? 50 : scope.id;

    await this._resultRepository.save(result);
  }

  private resolveScopeId(scopeId: number, countries?: any[]) {
    if ([4, 50].includes(scopeId)) return 50;
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

    // Caso sin países válidos o alcance global/regional sin detalle
    if ((!hasCountries && scopeId !== 3) || scopeId === 4) {
      await this._resultCountryRepository.updateCountries(result.id, []);
      result.has_countries = false;
      return;
    }

    // --- Buscar países en clarisa_countries ---
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
