import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { In } from 'typeorm';
import { BilateralProjectsService } from './bilateral-projects.service';
import { BilateralService } from '../bilateral.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateCenterResultDto } from '../dto/create-center-result.dto';
import { SaveBilateralTocMappingDto } from '../dto/save-bilateral-toc-mapping.dto';
import {
  BilateralProjectDto,
  InstitutionDto,
  PartnerInstitutionDto,
  SaveBilateralContributorsDto,
} from '../dto/save-bilateral-contributors.dto';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsByProjectsService } from '../../results/results_by_projects/results_by_projects.service';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { Result, SourceEnum } from '../../results/entities/result.entity';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultRepository } from '../../results/result.repository';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { YearRepository } from '../../results/years/year.repository';
import { ResultByLevelRepository } from '../../results/result-by-level/result-by-level.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { ResultsTocResultRepository } from '../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaCentersRepository } from '../../../clarisa/clarisa-centers/clarisa-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ResultCreationMethod } from '../../../shared/constants/result-creation-method.enum';
import { ResultsKnowledgeProductsService } from '../../results/results-knowledge-products/results-knowledge-products.service';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import {
  ResultReviewHistory,
  ReviewActionEnum,
} from '../../results/result-review-history/entities/result-review-history.entity';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsKnowledgeProductsRepository } from '../../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { InstitutionRoleEnum } from '../../results/results_by_institutions/entities/institution_role.enum';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';

@Injectable()
export class BilateralCenterService {
  private readonly logger = new Logger(BilateralCenterService.name);

  constructor(
    private readonly bilateralProjectsService: BilateralProjectsService,
    private readonly bilateralService: BilateralService,
    private readonly versioningService: VersioningService,
    private readonly resultRepository: ResultRepository,
    private readonly resultByLevelRepository: ResultByLevelRepository,
    private readonly yearRepository: YearRepository,
    private readonly resultsTocResultsService: ResultsTocResultsService,
    private readonly resultsTocResultRepository: ResultsTocResultRepository,
    private readonly resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly clarisaCentersRepository: ClarisaCentersRepository,
    private readonly clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly resultsCenterRepository: ResultsCenterRepository,
    private readonly resultsByProjectsRepository: ResultsByProjectsRepository,
    private readonly resultsByProjectsService: ResultsByProjectsService,
    private readonly resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
    private readonly roleByUserRepository: RoleByUserRepository,
    private readonly resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
  ) {}

  async getProjects(centerId: number) {
    const projects =
      await this.bilateralProjectsService.getProjectsByCenter(centerId);
    return { response: projects };
  }

  async createResultHeader(user: TokenDto, dto: CreateCenterResultDto) {
    if (dto.result_type_id === ResultTypeEnum.CAPACITY_CHANGE) {
      throw new BadRequestException('CAPACITY_CHANGE is no longer accepted.');
    }

    const resultByLevel = await this.resultByLevelRepository.getByTypeAndLevel(
      dto.result_level_id,
      dto.result_type_id,
    );
    if (!resultByLevel) {
      throw new BadRequestException(
        `Invalid combination of result_level_id (${dto.result_level_id}) and result_type_id (${dto.result_type_id}).`,
      );
    }

    const version = await this.versioningService.$_findActivePhase(
      AppModuleIdEnum.REPORTING,
    );
    if (!version) {
      throw new BadRequestException('No active reporting phase found.');
    }

    const year = await this.yearRepository.findOne({
      where: { active: true },
    });
    if (!year) {
      throw new BadRequestException('No active year found.');
    }

    const draftTitle = `Bilateral Draft ${Date.now()}`;

    const result = await this.resultRepository.save({
      created_by: user.id,
      version_id: version.id,
      title: draftTitle,
      description: '',
      reported_year_id: year.year,
      result_code: 0,
      result_type_id: dto.result_type_id,
      result_level_id: dto.result_level_id,
      source: SourceEnum.Bilateral,
      status_id: ResultStatusData.Editing.value,
      creation_method: ResultCreationMethod.MANUAL,
    } as Result);

    await this.resultRepository.update(result.id, {
      title: `Bilateral Draft #${result.id}`,
    });

    const savedResult = await this.resultRepository.findOne({
      where: { id: result.id },
    });

    if (dto.program_code) {
      const initiative = await this.clarisaInitiativesRepository.findOne({
        where: { official_code: dto.program_code, active: true },
      });
      if (initiative) {
        await this.resultByInitiativesRepository.save({
          result_id: result.id,
          initiative_id: initiative.id,
          initiative_role_id: 1,
          is_active: true,
          created_by: user.id,
        });
      }
    }

    if (dto.lead_center) {
      await this.bilateralService.handleLeadCenter(
        result.id,
        dto.lead_center,
        user.id,
      );
    }

    if (dto.project_id) {
      await this.resultsByProjectsRepository.save({
        result_id: result.id,
        project_id: dto.project_id,
        created_by: user.id,
        is_lead: true,
      });
    }

    if (dto.result_type_id === ResultTypeEnum.KNOWLEDGE_PRODUCT) {
      try {
        await this.resultsKnowledgeProductsService.populateKPFromCGSpace(
          result.id,
          dto.handle,
          user,
        );
      } catch (error) {
        await this.resultRepository.update(result.id, { is_active: false });
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Failed to populate Knowledge Product metadata from CGSpace.',
        );
      }
    }

    // `result_code` is assigned by the `result_auto_code` BEFORE INSERT trigger, not by this insert —
    // the 0 above is only a placeholder. If the trigger is missing from an environment, every
    // bilateral row keeps code 0, and the detail endpoint (which resolves by result_code whenever a
    // phase is supplied) will hand back whichever draft it finds first. Say so in the logs instead of
    // shipping a code that silently points at someone else's result. Not thrown: that would take the
    // whole feature down in a mis-migrated environment, and the client already routes by id in this
    // case (see bilateral-result-creator.createResult).
    const assignedResultCode = savedResult?.result_code ?? result.result_code;
    if (!assignedResultCode || assignedResultCode <= 0) {
      this.logger.error(
        `Result ${result.id} was created without a result_code. ` +
          'Check that the `result_auto_code` trigger and `result_code_seq` table exist in this environment.',
      );
    }

    return {
      response: {
        id: result.id,
        result_code: assignedResultCode,
        version_id: savedResult?.version_id ?? result.version_id,
        result_level_id: result.result_level_id,
        result_type_id: result.result_type_id,
        source: result.source,
        status_id: result.status_id,
      },
    };
  }

  async getResultInitiativeId(resultId: number) {
    const owner =
      await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
        resultId,
      );
    return {
      response: {
        initiativeId: owner?.id ?? null,
        officialCode: owner?.official_code ?? null,
        initiativeName: owner?.initiative_name ?? null,
      },
    };
  }

  async getTocState(resultId: number) {
    try {
      const owner =
        await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!owner?.id) {
        return {
          response: {
            planned_result: null,
            toc_level_id: null,
            toc_result_id: null,
            indicator_id: null,
            toc_progressive_narrative: null,
          },
        };
      }

      const activeRecord = await this.resultsTocResultRepository.findOne({
        where: {
          result_id: resultId,
          initiative_ids: owner.id,
          is_active: true,
        },
      });

      if (!activeRecord) {
        return {
          response: {
            planned_result: null,
            toc_level_id: null,
            toc_result_id: null,
            indicator_id: null,
            toc_progressive_narrative: null,
          },
        };
      }

      let indicatorId: string | null = null;
      let contributingIndicator: number | null = null;
      if (activeRecord.result_toc_result_id) {
        const indicatorQuery = `
          SELECT 
            rtri.toc_results_indicator_id as id,
            rtri.result_toc_result_indicator_id as rtri_id
          FROM results_toc_result_indicators rtri
          WHERE rtri.results_toc_results_id = ?
            and rtri.is_active = 1
          LIMIT 1
        `;
        const indicatorResult: { id: string; rtri_id: number }[] =
          await this.resultsTocResultRepository.query(indicatorQuery, [
            activeRecord.result_toc_result_id,
          ]);
        if (indicatorResult?.length) {
          indicatorId = indicatorResult[0].id;
          const targetQuery = `
            SELECT rit.contributing_indicator
            FROM result_indicators_targets rit
            WHERE rit.result_toc_result_indicator_id = ?
              and rit.is_active = 1
            LIMIT 1
          `;
          const targetResult: { contributing_indicator: number }[] =
            await this.resultsTocResultRepository.query(targetQuery, [
              indicatorResult[0].rtri_id,
            ]);
          if (targetResult?.length) {
            contributingIndicator = targetResult[0].contributing_indicator;
          }
        }
      }

      return {
        response: {
          planned_result: activeRecord.planned_result,
          toc_level_id: activeRecord.toc_level_id ?? null,
          toc_result_id: activeRecord.toc_result_id ?? null,
          indicator_id: indicatorId,
          contributing_indicator: contributingIndicator,
          toc_progressive_narrative:
            activeRecord.toc_progressive_narrative ?? null,
        },
      };
    } catch (error) {
      return {
        response: {
          planned_result: null,
          toc_level_id: null,
          toc_result_id: null,
          indicator_id: null,
          toc_progressive_narrative: null,
        },
        message:
          error instanceof Error ? error.message : 'Failed to load TOC state',
      };
    }
  }

  async updatePlannedResult(
    resultId: number,
    body: { planned_result: boolean; programCode?: string },
    user: TokenDto,
  ) {
    try {
      let ownerInitiative =
        await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!ownerInitiative?.id && body.programCode) {
        const initiative = await this.clarisaInitiativesRepository.findOne({
          where: { official_code: body.programCode, active: true },
        });
        if (initiative) {
          ownerInitiative = {
            id: initiative.id,
            official_code: initiative.official_code,
            initiative_name: initiative.name,
            inititiative_id: initiative.id,
            is_active: initiative.active ? 1 : 0,
            short_name: initiative.short_name ?? '',
          };
        }
      }

      if (!ownerInitiative?.id) {
        return {
          response: { resultId },
          message: 'Owner initiative not found for this result',
          status: 404,
        };
      }

      return this.resultsTocResultsService.updatePlannedResult(
        resultId,
        body.planned_result,
        user.id,
      );
    } catch (error) {
      return {
        response: {},
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update planned result',
        status: 500,
      };
    }
  }

  async saveTocMapping(
    resultId: number,
    dto: SaveBilateralTocMappingDto,
    user: TokenDto,
  ) {
    try {
      const ownerInitiative =
        await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!ownerInitiative?.id) {
        return {
          response: { resultId },
          message: 'Owner initiative not found for this result',
          status: 404,
        };
      }

      const resultTocResult = {
        ...dto.result_toc_result,
        initiative_id: ownerInitiative.id,
      };

      return this.resultsTocResultsService.updateTocResultPartial(
        resultId,
        resultTocResult,
        user,
      );
    } catch (error) {
      return {
        response: {},
        message:
          error instanceof Error ? error.message : 'Failed to save ToC mapping',
        status: 500,
      };
    }
  }

  async saveContributors(
    resultId: number,
    dto: SaveBilateralContributorsDto,
    user: TokenDto,
  ) {
    const result: {
      savedCenters: Array<Record<string, unknown>>;
      failedCenters: Array<Record<string, unknown>>;
      savedProjects: Array<Record<string, unknown>>;
      failedProjects: Array<Record<string, unknown>>;
      deactivatedProjects: number[];
      savedPartners: Array<Record<string, unknown>>;
      failedPartners: Array<Record<string, unknown>>;
      deactivatedPartners: number[];
    } = {
      savedCenters: [],
      failedCenters: [],
      savedProjects: [],
      failedProjects: [],
      deactivatedProjects: [],
      savedPartners: [],
      failedPartners: [],
      deactivatedPartners: [],
    };

    try {
      const bilResult = await this.resultRepository.findOne({
        where: { id: resultId, source: SourceEnum.Bilateral },
      });
      if (!bilResult) {
        return {
          response: { resultId },
          message: 'Bilateral result not found',
          status: 404,
        };
      }

      if (dto.contributing_center !== undefined) {
        await this.syncContributingCenters(
          resultId,
          dto.contributing_center,
          user,
          result,
        );
      }

      if (dto.contributing_bilateral_projects !== undefined) {
        await this.syncContributingProjects(
          resultId,
          dto.contributing_bilateral_projects,
          user,
          result,
        );
      }

      // P2-3443. Any of the three keys is enough to touch the partner block: the "no external
      // partners" declaration arrives on its own (the dropdown is hidden when it is ticked), and
      // `is_lead_by_partner` is a plain flag on `result`.
      if (
        dto.institutions !== undefined ||
        dto.no_external_partners !== undefined ||
        dto.is_lead_by_partner !== undefined
      ) {
        await this.syncExternalPartners(resultId, dto, user, result);
      }

      const failedCount =
        result.failedCenters.length +
        result.failedProjects.length +
        result.failedPartners.length;

      return {
        response: { resultId, ...result },
        message:
          failedCount === 0
            ? 'Contributors saved successfully'
            : `Contributors saved with ${result.failedCenters.length} failed centers, ${result.failedProjects.length} failed projects and ${result.failedPartners.length} failed partners`,
      };
    } catch (error) {
      return {
        response: {},
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save contributors',
        status: 500,
      };
    }
  }

  /**
   * P2-3443 — persists the External partners block of the bilateral Contributors section.
   *
   * Deliberately mirrors what pool funding does in
   * `ResultsByInstitutionsService.savePartnersInstitutionsByResultV2`
   * (`api/results/results_by_institutions/results_by_institutions.service.ts:392-462`) so both
   * forms leave the same rows behind and the shared `validation_partners_*` MySQL functions see
   * one single data model:
   *
   * - the two flags live on `result` (`no_applicable_partner`, `is_lead_by_partner`), NOT on a
   *   bilateral-only table — that is why this ticket needs no migration;
   * - partners are `results_by_institution` rows whose `institution_roles_id` is resolved exactly
   *   as pool funding resolves it: `KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS` (8) when the result
   *   has a `results_knowledge_product` row, `PARTNER` (2) otherwise. Both ids are what the
   *   validation function counts (`institution_roles_id IN (2,8)`), so picking the wrong one hides
   *   the partners from the green check rather than failing loudly;
   * - ticking "no external partners" deactivates every stored partner instead of leaving orphans.
   *
   * NOT mirrored on purpose: partner delivery types and budgets. P2-3368 (AC6) puts partner-type /
   * nature attributes out of scope for bilateral results, so there is no UI feeding them.
   */
  private async syncExternalPartners(
    resultId: number,
    dto: SaveBilateralContributorsDto,
    user: TokenDto,
    result: {
      savedPartners: Array<Record<string, unknown>>;
      failedPartners: Array<Record<string, unknown>>;
      deactivatedPartners: number[];
    },
  ): Promise<void> {
    const flagsToUpdate: {
      no_applicable_partner?: boolean;
      is_lead_by_partner?: boolean;
    } = {};
    if (dto.no_external_partners !== undefined) {
      flagsToUpdate.no_applicable_partner = !!dto.no_external_partners;
    }
    if (dto.is_lead_by_partner !== undefined) {
      flagsToUpdate.is_lead_by_partner = !!dto.is_lead_by_partner;
    }
    if (Object.keys(flagsToUpdate).length > 0) {
      await this.resultRepository.update(resultId, flagsToUpdate);
    }

    const knowledgeProduct =
      await this.resultsKnowledgeProductsRepository.findOne({
        where: { results_id: resultId },
      });
    const institutionRoleId = knowledgeProduct
      ? InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS
      : InstitutionRoleEnum.PARTNER;

    const existingPartners = await this.resultByIntitutionsRepository.find({
      where: {
        result_id: resultId,
        institution_roles_id: institutionRoleId,
      },
    });
    const activePartners = existingPartners.filter((p) => p.is_active);

    if (dto.no_external_partners === true) {
      await this.deactivatePartners(activePartners, user, result);
      return;
    }

    if (dto.institutions === undefined) {
      return;
    }

    const requestedIds = await this.resolvePartnerInstitutionIds(
      dto.institutions,
      result,
    );

    const toDeactivate = activePartners.filter(
      (p) => !requestedIds.includes(Number(p.institutions_id)),
    );
    await this.deactivatePartners(toDeactivate, user, result);

    const leadingByInstitutionId = this.mapLeadingPartnerFlags(
      dto.institutions,
    );

    const byInstitutionId = new Map<number, ResultsByInstitution>();
    for (const partner of existingPartners) {
      const key = Number(partner.institutions_id);
      if (!byInstitutionId.has(key)) {
        byInstitutionId.set(key, partner);
      }
    }

    for (const institutionId of requestedIds) {
      const isLeadingResult =
        leadingByInstitutionId.get(institutionId) ?? false;
      const existing = byInstitutionId.get(institutionId);
      if (existing) {
        await this.resultByIntitutionsRepository.update(
          { id: existing.id },
          {
            is_active: true,
            is_leading_result: isLeadingResult,
            last_updated_by: user.id,
          },
        );
      } else {
        await this.resultByIntitutionsRepository.save({
          result_id: resultId,
          institutions_id: institutionId,
          institution_roles_id: institutionRoleId,
          is_active: true,
          is_predicted: false,
          is_leading_result: isLeadingResult,
          from_toc: false,
          created_by: user.id,
          last_updated_by: user.id,
        });
      }
      result.savedPartners.push({ institutions_id: institutionId });
    }
  }

  /**
   * P2-3443 — `PartnerInstitutionDto.is_leading_result` is honoured, exactly as pool funding honours
   * it in `ResultsByInstitutionsService.handleInstitutions`
   * (`api/results/results_by_institutions/results_by_institutions.service.ts:1079,1094`).
   *
   * ⚠️ It is not cosmetic: the shared green-check functions read
   * `WHEN institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE`
   * (`src/migrations/1762866499786-updatepartnersContributors.ts:157`), so writing every partner as
   * `false` would leave a result with `is_lead_by_partner = true` permanently unable to go green.
   *
   * Duplicate `institutions_id` entries collapse first-occurrence-wins, matching how
   * `resolvePartnerInstitutionIds` de-duplicates the ids themselves.
   */
  private mapLeadingPartnerFlags(
    institutions: PartnerInstitutionDto[],
  ): Map<number, boolean> {
    const flags = new Map<number, boolean>();
    for (const institution of institutions ?? []) {
      const id = Number(institution?.institutions_id);
      if (!Number.isFinite(id) || id <= 0 || flags.has(id)) continue;
      flags.set(id, !!institution?.is_leading_result);
    }
    return flags;
  }

  /**
   * CLARISA ids arriving from a client are never trusted (module rule): an institution that is not
   * in the cached catalogue is reported back on `failedPartners` instead of being written as a
   * dangling FK.
   */
  private async resolvePartnerInstitutionIds(
    institutions: PartnerInstitutionDto[],
    result: { failedPartners: Array<Record<string, unknown>> },
  ): Promise<number[]> {
    const incomingIds: number[] = [];
    for (const institution of institutions) {
      const id = Number(institution?.institutions_id);
      if (!Number.isFinite(id) || id <= 0) {
        result.failedPartners.push({
          institutions_id: institution?.institutions_id,
          reason: 'No institutions_id provided',
        });
        continue;
      }
      if (!incomingIds.includes(id)) {
        incomingIds.push(id);
      }
    }

    if (incomingIds.length === 0) {
      return [];
    }

    const knownInstitutions = await this.clarisaInstitutionsRepository.find({
      where: { id: In(incomingIds) },
      select: ['id'],
    });
    const knownIds = new Set(knownInstitutions.map((i) => Number(i.id)));

    const resolved: number[] = [];
    for (const id of incomingIds) {
      if (!knownIds.has(id)) {
        result.failedPartners.push({
          institutions_id: id,
          reason: 'Institution not found in CLARISA',
        });
        continue;
      }
      resolved.push(id);
    }
    return resolved;
  }

  private async deactivatePartners(
    partners: ResultsByInstitution[],
    user: TokenDto,
    result: { deactivatedPartners: number[] },
  ): Promise<void> {
    if (!partners.length) {
      return;
    }
    const ids = partners.map((p) => p.id);
    await this.resultByIntitutionsRepository.update(
      { id: In(ids) },
      { is_active: false, last_updated_by: user.id },
    );
    result.deactivatedPartners.push(...ids.map((id) => Number(id)));
  }

  private async syncContributingCenters(
    resultId: number,
    centers: InstitutionDto[],
    user: TokenDto,
    result: {
      savedCenters: Array<Record<string, unknown>>;
      failedCenters: Array<Record<string, unknown>>;
    },
  ): Promise<void> {
    const institutionIds = centers
      .map((c) => c.institution_id)
      .filter((id): id is number => id !== undefined && id !== null);

    const clarisaCenters =
      institutionIds.length > 0
        ? await this.clarisaCentersRepository.find({
            where: { institutionId: In(institutionIds) },
          })
        : [];

    const codeByInstitution = new Map<number, string>();
    for (const center of clarisaCenters) {
      if (!codeByInstitution.has(center.institutionId)) {
        codeByInstitution.set(center.institutionId, center.code);
      }
    }

    const centerCodes: string[] = [];
    for (const center of centers) {
      if (
        center.institution_id === undefined ||
        center.institution_id === null
      ) {
        result.failedCenters.push({
          institution_id: center.institution_id,
          reason: 'No institution_id provided',
        });
        continue;
      }

      const centerCode = codeByInstitution.get(center.institution_id);
      if (!centerCode) {
        result.failedCenters.push({
          institution_id: center.institution_id,
          reason: 'Institution has no clarisa_center record',
        });
        continue;
      }

      if (!centerCodes.includes(centerCode)) {
        centerCodes.push(centerCode);
      }
      result.savedCenters.push({
        institution_id: center.institution_id,
        centerCode,
      });
    }

    const leadingRows = await this.resultsCenterRepository.find({
      where: { result_id: resultId, is_leading_result: true },
    });
    const leadingCodes = leadingRows.map((row) => row.center_id);

    await this.resultsCenterRepository.updateCenter(
      resultId,
      centerCodes,
      user.id,
    );

    for (const centerCode of centerCodes) {
      const existing =
        await this.resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
          resultId,
          centerCode,
        );
      if (!existing) {
        await this.resultsCenterRepository.save({
          result_id: resultId,
          center_id: centerCode,
          is_primary: false,
          is_leading_result: leadingCodes.includes(centerCode),
          from_cgspace: false,
          is_active: true,
          created_by: user.id,
          last_updated_by: user.id,
        });
      } else if (leadingCodes.includes(centerCode)) {
        await this.resultsCenterRepository.update(
          { id: existing.id },
          {
            is_leading_result: true,
            is_active: true,
            last_updated_by: user.id,
          },
        );
      }
    }
  }

  private async syncContributingProjects(
    resultId: number,
    projects: BilateralProjectDto[],
    user: TokenDto,
    result: {
      savedProjects: Array<Record<string, unknown>>;
      failedProjects: Array<Record<string, unknown>>;
      deactivatedProjects: number[];
    },
  ): Promise<void> {
    const syncResult =
      await this.resultsByProjectsService.syncBilateralProjects(
        resultId,
        projects,
        user.id,
      );

    if (syncResult?.status >= 400) {
      result.failedProjects.push({
        reason: syncResult.message || 'Failed syncing bilateral projects',
      });
      return;
    }

    const syncResponse = syncResult?.response as
      | {
          set_active?: number[];
          deactivated?: number[];
        }
      | undefined;

    result.deactivatedProjects = syncResponse?.deactivated ?? [];
    result.savedProjects = (syncResponse?.set_active ?? []).map(
      (projectId: number) => ({ project_id: projectId }),
    );

    await this.resultsByProjectsRepository.update(
      { result_id: resultId, is_active: true },
      { is_lead: false, last_updated_by: user.id },
    );

    const leadIds = projects
      .filter((p) => p.is_lead === true || p.is_lead === 1)
      .map((p) => Number(p.project_id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (leadIds.length) {
      await this.resultsByProjectsRepository.update(
        {
          result_id: resultId,
          project_id: In(leadIds),
          is_active: true,
        },
        { is_lead: true, last_updated_by: user.id },
      );
    }
  }

  /**
   * P2-3157 — hands a centre-authored bilateral result over to the Science Program for review.
   *
   * Without this transition the review loop is unreachable from the PRMS centre UI: `create-header`
   * leaves the result in Editing (or Draft, for AI-assisted ones) and `reviewBilateralResult`
   * refuses anything that is not PENDING_REVIEW.
   *
   * The owner-initiative guard matters beyond correctness: the notification read paths
   * (`getAllNotifications` / `getPopUpNotifications`) require an active `initiative_role_id = 1`
   * row, and `_updateTocMapping` dereferences it on approval. Letting a result through without one
   * would produce an invisible notification and a 500 on approve.
   */
  async submitForReview(user: TokenDto, resultId: number) {
    const parsedResultId = Number(resultId);
    if (
      !parsedResultId ||
      !Number.isFinite(parsedResultId) ||
      parsedResultId <= 0
    ) {
      throw new BadRequestException(
        'The resultId parameter must be a valid positive number.',
      );
    }

    const result = await this.resultRepository.findOne({
      where: {
        id: parsedResultId,
        source: SourceEnum.Bilateral,
        is_active: true,
      },
    });

    if (!result) {
      throw new BadRequestException('Bilateral result not found');
    }

    const submittableStatuses = [
      ResultStatusData.Editing.value,
      ResultStatusData.Draft.value,
    ];
    const currentStatusId = Number(result.status_id);
    if (!submittableStatuses.includes(currentStatusId)) {
      throw new BadRequestException(
        `Only a result in Editing or Draft can be submitted for review (status_id: ${result.status_id})`,
      );
    }

    await this.assertCenterPermission(user, parsedResultId);

    const owner =
      await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
        parsedResultId,
      );
    if (!owner?.id) {
      throw new BadRequestException(
        'The result has no Science Program assigned. Select a Science Program before submitting for review.',
      );
    }

    await this.resultRepository.manager.transaction(async (manager) => {
      await manager.update(
        Result,
        { id: parsedResultId },
        {
          status_id: ResultStatusData.PendingReview.value,
          last_updated_by: user.id,
        },
      );

      // The action enum has no dedicated SUBMIT value and the column enum is narrow, so the
      // transition is recorded as UPDATE — the same value the review-update flows already write.
      const reviewHistory = manager.create(ResultReviewHistory, {
        result_id: parsedResultId,
        action: ReviewActionEnum.UPDATE,
        comment: 'Submitted for review by the reporting center',
        created_by: user.id,
      });
      await manager.save(ResultReviewHistory, reviewHistory);
    });

    return {
      response: {
        resultId: parsedResultId,
        status: ResultStatusData.PendingReview.value,
      },
      message: 'Result submitted for review successfully',
    };
  }

  /** The caller must hold the Center User role on the result's lead centre. */
  private async assertCenterPermission(
    user: TokenDto,
    resultId: number,
  ): Promise<void> {
    const centers =
      await this.resultsCenterRepository.getAllResultsCenterByResultId(
        resultId,
      );

    const leadCenter = (centers ?? []).find(
      (center) => Number(center?.is_leading_result) === 1,
    );

    if (!leadCenter?.code) {
      throw new BadRequestException(
        'The result has no lead center assigned. Select a lead center before submitting for review.',
      );
    }

    const isAllowed =
      await this.roleByUserRepository.validationCenterPermissions(
        user.id,
        String(leadCenter.code),
      );

    if (!isAllowed) {
      throw new ForbiddenException(
        'You do not have permission to submit results for this center.',
      );
    }
  }
}
