import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { ResultsByInstitutionsService } from '../../results/results_by_institutions/results_by_institutions.service';
import { CreateResultsTocResultV2Dto } from '../../results/results-toc-results/dto/create-results-toc-result-v2.dto';
import { SavePartnersV2Dto } from '../../results/results_by_institutions/dto/save-partners-v2.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { LinkedResultRepository } from '../../results/linked-results/linked-results.repository';
import { LinkedResultsService } from '../../results/linked-results/linked-results.service';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';
import {
  throwServiceError,
  formatUnknownError,
} from '../../../shared/utils/service-error.util';

@Injectable()
export class ContributorsPartnersService {
  private readonly logger = new Logger(ContributorsPartnersService.name);

  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsTocResultsService: ResultsTocResultsService,
    private readonly _resultsByInstitutionsService: ResultsByInstitutionsService,
    private readonly _linkedResultRepository: LinkedResultRepository,
    private readonly _linkedResultsService: LinkedResultsService,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
  ) {}

  async getContributorsPartnersByResultId(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const resultInit =
        await this._resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!result?.id || !resultInit?.id) {
        throwServiceError(
          'Result or Initiative not found',
          HttpStatus.NOT_FOUND,
          { resultId },
        );
      }

      const resultTypeId = Number(result.result_type_id);

      const partnersSnapshot =
        await this._resultsByInstitutionsService.getInstitutionsPartnersByResultIdV2(
          resultId,
        );

      if (
        partnersSnapshot?.status &&
        partnersSnapshot.status !== HttpStatus.OK
      ) {
        return partnersSnapshot;
      }

      const partnersResponse = (partnersSnapshot?.response ?? {}) as Record<
        string,
        any
      >;

      const institutionsData = (partnersResponse.institutions ?? []).map(
        (inst: any) => ({
          ...inst,
          delivery: (inst.delivery ?? []).filter((d) => d.is_active),
        }),
      );

      const mqapInstitutionsData = (
        partnersResponse.mqap_institutions ?? []
      ).map((inst: any) => ({
        ...inst,
        delivery: (inst.delivery ?? []).filter((d) => d.is_active),
      }));

      const contributingCenters = partnersResponse.contributing_center ?? [];
      const bilateralProjects = partnersResponse.bilateral_projects ?? [];

      const tocMappingRes =
        await this._resultsTocResultsService.getTocByResultV2(resultId);

      if (tocMappingRes?.status && tocMappingRes.status !== HttpStatus.OK) {
        return tocMappingRes;
      }

      const tocResponse =
        (tocMappingRes?.response as Record<string, any>) ?? {};
      const tocMapping = {
        contributing_initiatives: tocResponse.contributing_initiatives ?? {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: [],
        },
        contributing_and_primary_initiative:
          tocResponse.contributing_and_primary_initiative ?? [],
        result_toc_result: tocResponse.result_toc_result ?? null,
        contributors_result_toc_result:
          tocResponse.contributors_result_toc_result ?? [],
        impacts: tocResponse.impacts ?? null,
        impactsTarge: tocResponse.impactsTarge ?? null,
        sdgTargets: tocResponse.sdgTargets ?? null,
      };

      let hasInnovationLink = false;
      let linkedResultIds: number[] = [];

      const noApplicablePartner =
        partnersResponse.no_applicable_partner ??
        !!result.no_applicable_partner;
      const isLeadByPartner =
        partnersResponse.is_lead_by_partner ?? !!result.is_lead_by_partner;

      const [linkFlag, linkedIds] = await Promise.all([
        this.getInnovationLinkStatus(result.id, resultTypeId),
        this._linkedResultRepository.getActiveLinkedResultIds(result.id),
      ]);

      hasInnovationLink = linkFlag;
      linkedResultIds = linkedIds ?? [];

      return {
        response: {
          result_id: resultId,
          result_code: result.result_code,
          title: result.title,
          level_id: result.result_level_id,
          owner_initiative: resultInit,
          ...tocMapping,
          institutions: institutionsData,
          mqap_institutions: mqapInstitutionsData,
          contributing_center: contributingCenters,
          bilateral_projects: bilateralProjects,
          no_applicable_partner: noApplicablePartner,
          is_lead_by_partner: isLeadByPartner,
          has_innovation_link: hasInnovationLink,
          linked_results: linkedResultIds,
        },
        message: 'Contributors and Partners fetched successfully (P25)',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async updateTocMappingV2(
    resultId: number,
    dto: CreateResultsTocResultV2Dto,
    user: TokenDto,
  ) {
    dto.result_id = resultId;
    return this._resultsTocResultsService.createTocMappingV2(dto, user);
  }

  async updatePartnersV2(
    resultId: number,
    dto: SavePartnersV2Dto,
    user: TokenDto,
  ) {
    dto.result_id = resultId;
    return this._resultsByInstitutionsService.savePartnersInstitutionsByResultV2(
      dto,
      user,
    );
  }

  async updateContributorsAndPartners(
    resultId: number,
    payload: UpdateContributorsPartnersDto,
    user: TokenDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);

      if (!result?.id) {
        throwServiceError('Result not found.', HttpStatus.NOT_FOUND, {
          resultId,
        });
      }

      const resultTypeId = Number(result.result_type_id);
      const sections = this.resolveContributorsPartnersSections(payload);

      if (
        !sections.hasUnifiedToc &&
        !sections.hasUnifiedPartners &&
        !sections.hasInnovationLinkPayload
      ) {
        return {
          response: {},
          message: 'No payload provided to update.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const response: Record<string, any> = {};
      const statuses: number[] = [];
      const messages: string[] = [];

      if (sections.hasUnifiedToc) {
        const tocUpdate = await this.applyTocMappingSectionUpdate(
          resultId,
          payload,
          user,
        );
        this.appendSectionUpdate(
          response,
          statuses,
          messages,
          tocUpdate.fields,
          tocUpdate.status,
          tocUpdate.message,
        );
      }

      if (sections.hasUnifiedPartners) {
        const partnersUpdate = await this.applyPartnersSectionUpdate(
          resultId,
          payload,
          user,
        );
        this.appendSectionUpdate(
          response,
          statuses,
          messages,
          partnersUpdate.fields,
          partnersUpdate.status,
          partnersUpdate.message,
        );
      }

      if (sections.hasInnovationLinkPayload) {
        const innovationUpdate = await this.applyInnovationLinkSectionUpdate(
          resultId,
          resultTypeId,
          payload,
          user,
          sections.hasInnovationLinkProp,
        );
        this.appendSectionUpdate(
          response,
          statuses,
          messages,
          innovationUpdate.fields,
          innovationUpdate.status,
          innovationUpdate.message,
        );
      }

      await this._resultRepository.update(resultId, {
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

      const status = statuses.length ? Math.max(...statuses) : HttpStatus.OK;

      return {
        response,
        message: messages.join(' | ') || 'Contributors and partners updated.',
        status,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private resolveContributorsPartnersSections(
    payload: UpdateContributorsPartnersDto,
  ): {
    hasUnifiedToc: boolean;
    hasUnifiedPartners: boolean;
    hasInnovationLinkPayload: boolean;
    hasInnovationLinkProp: boolean;
  } {
    const hasProp = (key: string) =>
      Object.prototype.hasOwnProperty.call(payload ?? {}, key);

    return {
      hasUnifiedToc: [
        'contributing_initiatives',
        'accepted_contributing_initiatives',
        'pending_contributing_initiatives',
        'changePrimaryInit',
        'email_template',
        'result_toc_result',
        'contributors_result_toc_result',
        'cancel_pending_requests',
      ].some(hasProp),
      hasUnifiedPartners: [
        'institutions',
        'mqap_institutions',
        'contributing_center',
        'bilateral_projects',
        'bilateral_project',
        'no_applicable_partner',
        'is_lead_by_partner',
      ].some(hasProp),
      hasInnovationLinkPayload:
        hasProp('has_innovation_link') || hasProp('linked_results'),
      hasInnovationLinkProp: hasProp('has_innovation_link'),
    };
  }

  private appendSectionUpdate(
    response: Record<string, any>,
    statuses: number[],
    messages: string[],
    fields: Record<string, any>,
    status: number,
    message?: string,
  ): void {
    Object.assign(response, fields);
    statuses.push(status);
    if (message) {
      messages.push(message);
    }
  }

  private async applyTocMappingSectionUpdate(
    resultId: number,
    payload: UpdateContributorsPartnersDto,
    user: TokenDto,
  ): Promise<{
    fields: Record<string, any>;
    status: number;
    message?: string;
  }> {
    const tocPayload: CreateResultsTocResultV2Dto & {
      contributing_initiatives?: UpdateContributorsPartnersDto['contributing_initiatives'];
    } = {
      contributing_initiatives: payload.contributing_initiatives,
      accepted_contributing_initiatives:
        payload.accepted_contributing_initiatives,
      pending_contributing_initiatives:
        payload.pending_contributing_initiatives,
      cancel_pending_requests: payload.cancel_pending_requests,
      changePrimaryInit: payload.changePrimaryInit,
      email_template: payload.email_template,
      result_toc_result: payload.result_toc_result,
      contributors_result_toc_result: payload.contributors_result_toc_result,
    };

    const tocRes = await this.updateTocMappingV2(resultId, tocPayload, user);

    return {
      fields: { toc_mapping: tocRes.response },
      status: tocRes.status ?? HttpStatus.OK,
      message: tocRes.message,
    };
  }

  private async applyPartnersSectionUpdate(
    resultId: number,
    payload: UpdateContributorsPartnersDto,
    user: TokenDto,
  ): Promise<{
    fields: Record<string, any>;
    status: number;
    message?: string;
  }> {
    const partnersPayload: SavePartnersV2Dto = {
      result_id: resultId,
      institutions: payload.institutions,
      mqap_institutions: payload.mqap_institutions,
      contributing_center: payload.contributing_center,
      bilateral_project:
        (payload as any).bilateral_project ?? payload.bilateral_projects,
      no_applicable_partner: payload.no_applicable_partner,
      is_lead_by_partner: payload.is_lead_by_partner,
    };

    const partnersRes = await this.updatePartnersV2(
      resultId,
      partnersPayload,
      user,
    );

    return {
      fields: { partners: partnersRes.response },
      status: partnersRes.status ?? HttpStatus.OK,
      message: partnersRes.message,
    };
  }

  private async applyInnovationLinkSectionUpdate(
    resultId: number,
    resultTypeId: number,
    payload: UpdateContributorsPartnersDto,
    user: TokenDto,
    hasInnovationLinkProp: boolean,
  ): Promise<{
    fields: Record<string, any>;
    status: number;
    message: string;
  }> {
    const normalizedLinkedIds = this.normalizeLinkedResultIds(
      payload.linked_results,
    );
    const requestedHasInnovationLink = hasInnovationLinkProp
      ? Boolean(payload.has_innovation_link)
      : normalizedLinkedIds.length > 0;

    const filteredLinkedIds = requestedHasInnovationLink
      ? await this.filterActiveLinkedResults(normalizedLinkedIds)
      : [];

    await this._linkedResultsService.createForInnovationUse(
      resultId,
      filteredLinkedIds,
      user,
    );

    const persistedLinkedIds =
      (await this._linkedResultRepository.getActiveLinkedResultIds(resultId)) ??
      [];

    const finalHasInnovationLink =
      requestedHasInnovationLink && persistedLinkedIds.length > 0;

    await this.updateInnovationSummaryLink(
      resultTypeId,
      resultId,
      finalHasInnovationLink,
      user.id,
    );

    const isInnovationResult =
      resultTypeId === ResultTypeEnum.INNOVATION_DEVELOPMENT ||
      resultTypeId === ResultTypeEnum.INNOVATION_USE;

    if (!isInnovationResult) {
      await this._resultRepository.update(resultId, {
        has_innovation_link: finalHasInnovationLink,
        last_updated_by: user.id,
      });
    }

    return {
      fields: {
        has_innovation_link: finalHasInnovationLink,
        linked_results: persistedLinkedIds,
      },
      status: HttpStatus.OK,
      message: 'Linked result state updated.',
    };
  }

  private async getInnovationLinkStatus(
    resultId: number,
    resultTypeId: number,
  ): Promise<boolean> {
    try {
      if (resultTypeId === ResultTypeEnum.INNOVATION_DEVELOPMENT) {
        const rows = await this._resultsInnovationsDevRepository.query(
          `
            SELECT has_innovation_link
            FROM results_innovations_dev
            WHERE results_id = ?
            ORDER BY is_active DESC, result_innovation_dev_id DESC
            LIMIT 1
          `,
          [resultId],
        );

        const value = rows?.[0]?.has_innovation_link;
        return value === null || value === undefined ? false : Boolean(value);
      }

      if (resultTypeId === ResultTypeEnum.INNOVATION_USE) {
        const rows = await this._resultsInnovationsUseRepository.query(
          `
            SELECT has_innovation_link
            FROM results_innovations_use
            WHERE results_id = ?
            ORDER BY is_active DESC, result_innovation_use_id DESC
            LIMIT 1
          `,
          [resultId],
        );

        const value = rows?.[0]?.has_innovation_link;
        return value === null || value === undefined ? false : Boolean(value);
      }

      return this.getResultLinkStatus(resultId);
    } catch (error) {
      this.logger.error(
        `Error fetching innovation link status for result ID ${resultId}: ${error.message}`,
      );
      return false;
    }
  }

  private async getResultLinkStatus(resultId: number): Promise<boolean> {
    const result = await this._resultRepository.findOne({
      where: { id: resultId, is_active: true },
      select: { has_innovation_link: true },
    });

    if (
      result?.has_innovation_link === null ||
      result?.has_innovation_link === undefined
    ) {
      return false;
    }

    return Boolean(result.has_innovation_link);
  }

  private async updateInnovationSummaryLink(
    resultTypeId: number,
    resultId: number,
    hasInnovationLink: boolean,
    userId: number,
  ) {
    const isInnovationDev =
      resultTypeId === ResultTypeEnum.INNOVATION_DEVELOPMENT;
    const isInnovationUse = resultTypeId === ResultTypeEnum.INNOVATION_USE;

    if (!isInnovationDev && !isInnovationUse) {
      return;
    }

    try {
      if (isInnovationDev) {
        await this.upsertInnovationDevHasLink(
          resultId,
          hasInnovationLink,
          userId,
        );
        return;
      }

      await this.upsertInnovationUseHasLink(
        resultId,
        hasInnovationLink,
        userId,
      );
    } catch (error) {
      throwServiceError(
        `Failed to persist innovation link state for the result. ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
        { resultId, resultTypeId, hasInnovationLink },
      );
    }
  }

  private async upsertInnovationDevHasLink(
    resultId: number,
    hasInnovationLink: boolean,
    userId: number,
  ): Promise<void> {
    const linkValue = hasInnovationLink ? 1 : 0;
    const [existing] = await this._resultsInnovationsDevRepository.query(
      `
        SELECT result_innovation_dev_id
        FROM results_innovations_dev
        WHERE results_id = ?
        ORDER BY is_active DESC, result_innovation_dev_id DESC
        LIMIT 1
      `,
      [resultId],
    );

    if (existing?.result_innovation_dev_id) {
      await this._resultsInnovationsDevRepository.query(
        `
          UPDATE results_innovations_dev
          SET has_innovation_link = ?, is_active = 1, last_updated_by = ?, last_updated_date = NOW()
          WHERE result_innovation_dev_id = ?
        `,
        [linkValue, userId, existing.result_innovation_dev_id],
      );
      return;
    }

    await this._resultsInnovationsDevRepository.query(
      `
        INSERT INTO results_innovations_dev
          (results_id, has_innovation_link, is_active, created_by, last_updated_by, created_date, last_updated_date)
        VALUES (?, ?, 1, ?, ?, NOW(), NOW())
      `,
      [resultId, linkValue, userId, userId],
    );
  }

  private async upsertInnovationUseHasLink(
    resultId: number,
    hasInnovationLink: boolean,
    userId: number,
  ): Promise<void> {
    const linkValue = hasInnovationLink ? 1 : 0;
    const [existing] = await this._resultsInnovationsUseRepository.query(
      `
        SELECT result_innovation_use_id
        FROM results_innovations_use
        WHERE results_id = ?
        ORDER BY is_active DESC, result_innovation_use_id DESC
        LIMIT 1
      `,
      [resultId],
    );

    if (existing?.result_innovation_use_id) {
      await this._resultsInnovationsUseRepository.query(
        `
          UPDATE results_innovations_use
          SET has_innovation_link = ?, is_active = 1, last_updated_by = ?, last_updated_date = NOW()
          WHERE result_innovation_use_id = ?
        `,
        [linkValue, userId, existing.result_innovation_use_id],
      );
      return;
    }

    await this._resultsInnovationsUseRepository.query(
      `
        INSERT INTO results_innovations_use
          (results_id, has_innovation_link, is_active, created_by, last_updated_by, created_date, last_updated_date)
        VALUES (?, ?, 1, ?, ?, NOW(), NOW())
      `,
      [resultId, linkValue, userId, userId],
    );
  }

  private normalizeLinkedResultIds(
    raw?:
      | Array<
          | number
          | string
          | {
              id?: number | string;
              result_id?: number | string;
              selected?: boolean;
              is_active?: boolean;
            }
        >
      | number
      | string
      | {
          id?: number | string;
          result_id?: number | string;
          selected?: boolean;
          is_active?: boolean;
        }
      | null,
  ): number[] {
    if (raw === null || raw === undefined) {
      return [];
    }

    const values = Array.isArray(raw) ? raw : [raw];

    const sanitized = values
      .map((value) => {
        if (value === null || value === undefined) return null;

        if (typeof value === 'number' || typeof value === 'string') {
          const num = Number(value);
          return Number.isFinite(num) && num > 0 ? num : null;
        }

        if (typeof value === 'object') {
          const { id, result_id, selected, is_active } = value;

          if (
            selected === false ||
            (selected === undefined && is_active === false)
          ) {
            return null;
          }

          const candidate = id ?? result_id;
          const num = Number(candidate);
          return Number.isFinite(num) && num > 0 ? num : null;
        }

        return null;
      })
      .filter((value): value is number => value !== null);

    return Array.from(new Set(sanitized));
  }

  private async filterActiveLinkedResults(ids: number[]): Promise<number[]> {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const rows = await this._resultRepository.query(
      `SELECT id FROM result WHERE id IN (${placeholders}) AND is_active > 0`,
      ids,
    );

    return (rows ?? [])
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && ids.includes(id));
  }

  async updateUnplannedResult(
    resultId: number,
    plannedResult: boolean,
    user: TokenDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);

      if (!result?.id) {
        const error = new Error('Result not found');
        (error as any).response = { resultId };
        (error as any).status = HttpStatus.NOT_FOUND;
        throw error;
      }

      return await this._resultsTocResultsService.updatePlannedResult(
        resultId,
        plannedResult,
        user.id,
      );
    } catch (error) {
      return this._handlersError.returnErrorRes({
        error,
        debug: true,
      });
    }
  }
}
