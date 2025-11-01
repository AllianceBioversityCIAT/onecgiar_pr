import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { InstitutionRoleEnum } from '../../results/results_by_institutions/entities/institution_role.enum';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { ResultsByInstitutionsService } from '../../results/results_by_institutions/results_by_institutions.service';
import { CreateResultsTocResultV2Dto } from '../../results/results-toc-results/dto/create-results-toc-result-v2.dto';
import { SavePartnersV2Dto } from '../../results/results_by_institutions/dto/save-partners-v2.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { LinkedResultRepository } from '../../results/linked-results/linked-results.repository';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';
import { In } from 'typeorm';

@Injectable()
export class ContributorsPartnersService {
  private readonly logger = new Logger(ContributorsPartnersService.name);

  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultsBilateralRepository: ResultsByProjectsRepository,
    private readonly _resultsTocResultsService: ResultsTocResultsService,
    private readonly _resultsByInstitutionsService: ResultsByInstitutionsService,
    private readonly _linkedResultRepository: LinkedResultRepository,
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
        throw {
          response: { resultId },
          message: 'Result or Initiative not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const resultTypeId = Number(result.result_type_id);

      const institutionsData = await this._resultByIntitutionsRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
          institution_roles_id: InstitutionRoleEnum.PARTNER,
        },
        relations: {
          delivery: true,
          obj_institutions: { obj_institution_type_code: true },
        },
        order: { id: 'ASC' },
      });

      const institutions = institutionsData.map((inst) => ({
        id: inst.id,
        deliveries: inst.delivery.filter((d) => d.is_active),
        institution: inst.obj_institutions
          ? {
              name: inst.obj_institutions.name,
              website_link: inst.obj_institutions.website_link,
              type: inst.obj_institutions.obj_institution_type_code?.name,
            }
          : null,
      }));

      const mqap_institutions =
        await this._resultsByInstitutionsService.getInstitutionsPartnersByResultIdV2(
          resultId,
        );
      const mqapInstitutionsData =
        (mqap_institutions?.response as any)?.mqap_institutions || [];

      const contributingCenters =
        await this._resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );

      const bilateralProjects =
        await this._resultsBilateralRepository.findResultsByProjectsByResultId(
          resultId,
        );

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

      let innovationLink: {
        hasInnovationLink: boolean;
        linkedResultIds: number[];
      } | null = null;

      if (
        resultTypeId === ResultTypeEnum.INNOVATION_DEVELOPMENT ||
        resultTypeId === ResultTypeEnum.INNOVATION_USE
      ) {
        const [hasInnovationLink, linkedResultIds] = await Promise.all([
          this.getInnovationLinkStatus(result.id, resultTypeId),
          this._linkedResultRepository.getActiveLinkedResultIds(result.id),
        ]);

        innovationLink = {
          hasInnovationLink,
          linkedResultIds,
        };
      }

      return {
        response: {
          result_id: resultId,
          result_code: result.result_code,
          title: result.title,
          level_id: result.result_level_id,
          owner_initiative: resultInit,
          ...tocMapping,
          institutions,
          mqap_institutions: mqapInstitutionsData,
          contributing_center: contributingCenters,
          bilateral_projects: bilateralProjects,
          no_applicable_partner: !!result.no_applicable_partner,
          is_lead_by_partner: !!result.is_lead_by_partner,
          innovation_link: innovationLink,
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
        throw {
          response: { resultId },
          message: 'Result not found.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const resultTypeId = Number(result.result_type_id);
      const isInnovationResult =
        resultTypeId === ResultTypeEnum.INNOVATION_DEVELOPMENT ||
        resultTypeId === ResultTypeEnum.INNOVATION_USE;

      const hasProp = (key: string) =>
        Object.prototype.hasOwnProperty.call(payload ?? {}, key);

      const hasUnifiedToc = [
        'contributing_initiatives',
        'accepted_contributing_initiatives',
        'pending_contributing_initiatives',
        'changePrimaryInit',
        'email_template',
        'result_toc_result',
        'contributors_result_toc_result',
        'cancel_pending_requests',
      ].some(hasProp);

      const hasUnifiedPartners = [
        'institutions',
        'mqap_institutions',
        'contributing_center',
        'bilateral_projects',
        'bilateral_project',
        'no_applicable_partner',
        'is_lead_by_partner',
      ].some(hasProp);

      const hasInnovationLinkPayload =
        isInnovationResult &&
        (hasProp('has_innovation_link') || hasProp('linked_results'));

      if (!hasUnifiedToc && !hasUnifiedPartners && !hasInnovationLinkPayload) {
        return {
          response: {},
          message: 'No payload provided to update.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const response: Record<string, any> = {};
      const statuses: number[] = [];
      const messages: string[] = [];

      if (hasUnifiedToc) {
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
          contributors_result_toc_result:
            payload.contributors_result_toc_result,
        };

        const tocRes = await this.updateTocMappingV2(
          resultId,
          tocPayload,
          user,
        );
        response['toc_mapping'] = tocRes.response;
        statuses.push(tocRes.status ?? HttpStatus.OK);
        if (tocRes.message) messages.push(tocRes.message);
      }

      if (hasUnifiedPartners) {
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
        response['partners'] = partnersRes.response;
        statuses.push(partnersRes.status ?? HttpStatus.OK);
        if (partnersRes.message) messages.push(partnersRes.message);
      }

      if (hasInnovationLinkPayload) {
        const normalizedLinkedIds = this.normalizeLinkedResultIds(
          payload.linked_results,
        );
        const hasInnovationLink = hasProp('has_innovation_link')
          ? Boolean(payload.has_innovation_link)
          : normalizedLinkedIds.length > 0;

        await this.updateInnovationSummaryLink(
          resultTypeId,
          resultId,
          hasInnovationLink,
          user.id,
        );

        const desiredLinkedIds = hasInnovationLink ? normalizedLinkedIds : [];

        const persistedLinkedIds = await this.syncLinkedResults(
          resultId,
          desiredLinkedIds,
          user.id,
        );

        let finalHasInnovationLink = hasInnovationLink;
        if (hasInnovationLink && persistedLinkedIds.length === 0) {
          finalHasInnovationLink = false;
          await this.updateInnovationSummaryLink(
            resultTypeId,
            resultId,
            finalHasInnovationLink,
            user.id,
          );
        }

        response['innovation_link'] = {
          hasInnovationLink: finalHasInnovationLink,
          linkedResultIds: persistedLinkedIds,
        };
        statuses.push(HttpStatus.OK);
        messages.push('Innovation linkage updated.');
      }

      const status = statuses.length
        ? statuses.reduce((max, curr) => (curr > max ? curr : max), statuses[0])
        : HttpStatus.OK;

      return {
        response,
        message: messages.join(' | ') || 'Contributors and partners updated.',
        status,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async getInnovationLinkStatus(
    resultId: number,
    resultTypeId: number,
  ): Promise<boolean> {
    try {
      if (resultTypeId === ResultTypeEnum.INNOVATION_DEVELOPMENT) {
        const record = await this._resultsInnovationsDevRepository.findOne({
          where: { results_id: resultId, is_active: true },
          select: { has_innovation_link: true },
        });

        return !!record?.has_innovation_link;
      }

      if (resultTypeId === ResultTypeEnum.INNOVATION_USE) {
        const record = await this._resultsInnovationsUseRepository.findOne({
          where: { results_id: resultId, is_active: true },
          select: { has_innovation_link: true },
        });

        return !!record?.has_innovation_link;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Error fetching innovation link status for result ID ${resultId}: ${error.message}`,
      );
      return false;
    }
  }

  private async updateInnovationSummaryLink(
    resultTypeId: number,
    resultId: number,
    hasInnovationLink: boolean,
    userId: number,
  ) {
    try {
      if (resultTypeId === ResultTypeEnum.INNOVATION_DEVELOPMENT) {
        const existing = await this._resultsInnovationsDevRepository.findOne({
          where: { results_id: resultId, is_active: true },
        });

        if (existing) {
          await this._resultsInnovationsDevRepository.update(
            { results_id: resultId },
            {
              has_innovation_link: hasInnovationLink,
              last_updated_by: userId,
            },
          );
        } else {
          await this._resultsInnovationsDevRepository.save({
            results_id: resultId,
            has_innovation_link: hasInnovationLink,
            is_active: true,
            created_by: userId,
            last_updated_by: userId,
          } as any);
        }
        return;
      }

      if (resultTypeId === ResultTypeEnum.INNOVATION_USE) {
        const existing = await this._resultsInnovationsUseRepository.findOne({
          where: { results_id: resultId, is_active: true },
        });

        if (existing) {
          await this._resultsInnovationsUseRepository.update(
            { results_id: resultId },
            {
              has_innovation_link: hasInnovationLink,
              last_updated_by: userId,
            },
          );
        } else {
          await this._resultsInnovationsUseRepository.save({
            results_id: resultId,
            has_innovation_link: hasInnovationLink,
            is_active: true,
            created_by: userId,
            last_updated_by: userId,
          } as any);
        }
      }
    } catch (error) {
      throw {
        response: { resultId, resultTypeId, hasInnovationLink },
        message: 'Failed to persist innovation link state for the result.',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      };
    }
  }

  private async syncLinkedResults(
    resultId: number,
    desiredLinkedIds: number[],
    userId: number,
  ): Promise<number[]> {
    try {
      if (!desiredLinkedIds.length) {
        await this._linkedResultRepository.updateLink(
          resultId,
          [],
          [],
          userId,
          false,
        );
        return [];
      }

      const activeResults = await this._resultRepository.find({
        where: {
          id: In(desiredLinkedIds),
          is_active: true,
        },
      });

      const activeIds = new Set(
        (activeResults ?? []).map((result) => Number(result.id)),
      );

      const filteredLinkedIds = desiredLinkedIds.filter((id) =>
        activeIds.has(id),
      );

      if (!filteredLinkedIds.length) {
        await this._linkedResultRepository.updateLink(
          resultId,
          [],
          [],
          userId,
          false,
        );
        return [];
      }

      await this._linkedResultRepository.updateLink(
        resultId,
        filteredLinkedIds,
        [],
        userId,
        false,
      );

      const existing = await this._linkedResultRepository.find({
        where: {
          origin_result_id: resultId,
          linked_results_id: In(filteredLinkedIds),
        },
      });

      const existingIds = new Set(
        (existing ?? []).map((link) => Number(link.linked_results_id)),
      );

      const toCreate = filteredLinkedIds.filter((id) => !existingIds.has(id));

      if (!toCreate.length) {
        return filteredLinkedIds;
      }

      const newEntities = toCreate.map((id) =>
        this._linkedResultRepository.create({
          origin_result_id: resultId,
          linked_results_id: id,
          created_by: userId,
          last_updated_by: userId,
          is_active: true,
        }),
      );

      await this._linkedResultRepository.save(newEntities);

      return filteredLinkedIds;
    } catch (error) {
      throw {
        response: { resultId, desiredLinkedIds },
        message: 'Failed to synchronize linked results for the innovation.',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      };
    }
  }

  private normalizeLinkedResultIds(
    raw?: Array<number | string> | number | string | null,
  ): number[] {
    if (raw === null || raw === undefined) {
      return [];
    }

    const values = Array.isArray(raw) ? raw : [raw];

    const sanitized = values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    return Array.from(new Set(sanitized));
  }
}
