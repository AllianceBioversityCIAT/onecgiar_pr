import { Injectable } from '@nestjs/common';
import { CreateResultsFrameworkResultDto } from '../../../dto/create-results-framework.dto';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { ShareResultRequestService } from '../../../../results/share-result-request/share-result-request.service';
import { CreateTocShareResult } from '../../../../results/share-result-request/dto/create-toc-share-result.dto';
import { ResultsByProjectsService } from '../../../../results/results_by_projects/results_by_projects.service';
import { ResultsByInstitutionsService } from '../../../../results/results_by_institutions/results_by_institutions.service';
import { objectHasOwn } from '../../../../../shared/utils/object.utils';

@Injectable()
export class ApplyFrameworkResultAssociationsService {
  constructor(
    private readonly _shareResultRequestService: ShareResultRequestService,
    private readonly _resultsByProjectsService: ResultsByProjectsService,
    private readonly _resultsByInstitutionsService: ResultsByInstitutionsService,
  ) {}

  async execute(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
    createdResultId: number,
  ): Promise<void> {
    await this._shareContributors(payload, user, createdResultId);
    await this._linkBilateralProjects(payload, user, createdResultId);
    await this._applyPartnersSection(payload, user, createdResultId);
  }

  private async _shareContributors(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
    createdResultId: number,
  ): Promise<void> {
    if (!payload.contributors_result_toc_result?.length) {
      return;
    }

    const initiativeShareId = payload.contributors_result_toc_result
      .map((contributor) => this.resolveContributorInitiativeId(contributor))
      .filter((id): id is number => id !== null);

    if (!initiativeShareId.length) {
      return;
    }

    const initiativeFromToc = this.buildInitiativeFromTocMap(
      payload.contributors_result_toc_result,
    );

    const shareRequest: CreateTocShareResult = {
      initiativeShareId,
      isToc: false,
      contributors_result_toc_result: payload.contributors_result_toc_result,
      ...(Object.keys(initiativeFromToc).length ? { initiativeFromToc } : {}),
    };

    await this._shareResultRequestService.resultRequest(
      shareRequest,
      createdResultId,
      user,
    );
  }

  private async _linkBilateralProjects(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
    createdResultId: number,
  ): Promise<void> {
    if (
      !Array.isArray(payload.bilateral_project) ||
      !payload.bilateral_project.length
    ) {
      return;
    }

    for (const project of payload.bilateral_project) {
      const projectIdNum = Number(project?.project_id);
      if (Number.isFinite(projectIdNum) && projectIdNum > 0) {
        await this._resultsByProjectsService.linkBilateralProjectToResult(
          createdResultId,
          projectIdNum,
          user.id,
        );
      }
    }
  }

  private async _applyPartnersSection(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
    createdResultId: number,
  ): Promise<void> {
    const hasContributingCentersPayload = objectHasOwn(
      payload ?? {},
      'contributing_center',
    );
    const hasInstitutionsPayload = objectHasOwn(payload ?? {}, 'institutions');

    if (!hasContributingCentersPayload && !hasInstitutionsPayload) {
      return;
    }

    let contributingCenter = [];
    if (
      hasContributingCentersPayload &&
      Array.isArray(payload.contributing_center)
    ) {
      contributingCenter = payload.contributing_center;
    }

    let institutions: CreateResultsFrameworkResultDto['institutions'];
    if (hasInstitutionsPayload) {
      institutions = Array.isArray(payload.institutions)
        ? payload.institutions
        : [];
    }

    await this._resultsByInstitutionsService.savePartnersInstitutionsByResultV2(
      {
        result_id: createdResultId,
        contributing_center: contributingCenter,
        institutions,
        mqap_institutions: [],
      },
      user,
    );
  }

  private resolveContributorInitiativeId(contributor: {
    initiative_id?: number | string;
    id?: number | string;
  }): number | null {
    const id = Number(contributor?.initiative_id ?? contributor?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private buildInitiativeFromTocMap(
    contributors: Array<{
      initiative_id?: number | string;
      id?: number | string;
      from_toc?: boolean;
    }>,
  ): Record<number, boolean> {
    const map: Record<number, boolean> = {};

    for (const contributor of contributors ?? []) {
      const id = this.resolveContributorInitiativeId(contributor);
      if (id === null) {
        continue;
      }
      if (
        contributor?.from_toc !== undefined &&
        contributor?.from_toc !== null
      ) {
        map[id] = Boolean(contributor.from_toc);
      }
    }

    return map;
  }
}
