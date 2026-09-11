import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateResultsFrameworkResultDto } from '../../../dto/create-results-framework.dto';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { ShareResultRequestService } from '../../../../results/share-result-request/share-result-request.service';
import { CreateTocShareResult } from '../../../../results/share-result-request/dto/create-toc-share-result.dto';
import { ResultsByProjectsService } from '../../../../results/results_by_projects/results_by_projects.service';
import { ResultsByInstitutionsService } from '../../../../results/results_by_institutions/results_by_institutions.service';
import { objectHasOwn } from '../../../../../shared/utils/object.utils';
import { ResultTaggedNotificationService } from '../../../../notification/services/result-tagged-notification.service';
import { ContributorsPartnersService } from '../../../contributors-partners/contributors-partners.service';

@Injectable()
export class ApplyFrameworkResultAssociationsService {
  private readonly logger = new Logger(
    ApplyFrameworkResultAssociationsService.name,
  );

  constructor(
    private readonly _shareResultRequestService: ShareResultRequestService,
    private readonly _resultsByProjectsService: ResultsByProjectsService,
    private readonly _resultsByInstitutionsService: ResultsByInstitutionsService,
    private readonly _resultTaggedNotificationService: ResultTaggedNotificationService,
    private readonly _contributorsPartnersService: ContributorsPartnersService,
  ) {}

  async execute(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
    createdResultId: number,
  ): Promise<void> {
    await this._shareContributors(payload, user, createdResultId);
    await this._linkBilateralProjects(payload, user, createdResultId);
    await this._applyPartnersSection(payload, user, createdResultId);
    await this._persistInnovationLink(payload, user, createdResultId);
  }

  /**
   * P2-3604 — persists the "link to a QA'd Innovation Development result" answered on the emerging
   * creation panel, which reaches this endpoint inside `payload.result`.
   *
   * The panel asks the question, refuses to create the result until it is answered, and posts the
   * answer — and nothing here read it, so the record was created with the default and the reporter
   * found "No" with nothing linked when they opened it. No error, no warning. QA reproduced it three
   * times on result 9070.
   *
   * 🛑 Delegated to `ContributorsPartnersService`, never written here: that service is the single
   * writer for `results_innovations_use.has_innovation_link` and the `linked_result` table (Yeck's
   * decision, 31-Aug-2026), and duplicating the writer is what broke these links once before
   * (P2-3199). `ResultsService._persistInnovationLinkOnCreate` does exactly the same for the other
   * creation path, with the same guards, so the two entry points behave identically.
   *
   * "No" — the default — writes nothing, so a result created without the question ever being asked
   * stays exactly as it is today. Non-fatal by design: the result is already created, and the link
   * remains editable in Contributors and partners.
   */
  private async _persistInnovationLink(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
    createdResultId: number,
  ): Promise<void> {
    const result = payload?.result;

    if (!objectHasOwn(result ?? {}, 'has_innovation_link')) return;
    if (result?.has_innovation_link !== true) return;

    const linkedResults = Array.isArray(result?.linked_results)
      ? result.linked_results
      : [];
    if (!linkedResults.length) return;

    try {
      await this._contributorsPartnersService.updateContributorsAndPartners(
        createdResultId,
        {
          has_innovation_link: true,
          linked_results: linkedResults,
        } as any,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to persist the innovation link for result ${createdResultId}: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
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

    // P2-3214 AC2: only the ids that were actually inserted get notified. Centres go through
    // `handleContributingCenters` instead — the partners save below is what links them, and it
    // already knows which ones are new.
    const newlyLinked: number[] = [];

    for (const project of payload.bilateral_project) {
      const projectIdNum = Number(project?.project_id);
      if (Number.isFinite(projectIdNum) && projectIdNum > 0) {
        const linked =
          await this._resultsByProjectsService.linkBilateralProjectToResult(
            createdResultId,
            projectIdNum,
            user.id,
          );
        if (linked?.status === HttpStatus.CREATED) {
          newlyLinked.push(projectIdNum);
        }
      }
    }

    if (!newlyLinked.length) return;

    // Non-fatal: the links are already persisted, so a notification failure must not fail the
    // result creation.
    try {
      await this._resultTaggedNotificationService.notifyTaggedBilateralProjects(
        createdResultId,
        user.id,
        newlyLinked,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit tagged-project notifications for result ${createdResultId}: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
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
