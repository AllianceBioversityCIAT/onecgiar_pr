import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationService } from '../notification.service';
import { NotificationRepository } from '../repositories/notification.respository';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../enum/notification.enum';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { Result, SourceEnum } from '../../results/entities/result.entity';
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaProject } from '../../../clarisa/clarisa-projects/entity/clarisa-projects.entity';
import { ResultsCenter } from '../../results/results-centers/entities/results-center.entity';
import { ResultsByProjects } from '../../results/results_by_projects/entities/results_by_projects.entity';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import {
  buildCenterIndex,
  resolveProjectOwnerCenter,
  CenterIndex,
} from '../../bilateral/utils/project-owner-center.util';

/** One centre to notify, plus why it is being notified. */
interface TaggedTarget {
  centerCode: string;
  /** Human label the message names — the centre name, or the bilateral project's name. */
  label: string;
  type: NotificationTypeEnum;
}

/**
 * P2-3214 — notifies the users of a centre when a Science Program tags that centre (as lead or
 * contributor) or one of its bilateral projects on a result.
 *
 * Kept out of `NotificationService` deliberately: that class is already ~780 lines and owns the
 * generic emit/read plumbing, while everything here is about resolving *which* centre and *what
 * to call it*.
 */
@Injectable()
export class ResultTaggedNotificationService {
  private readonly logger = new Logger(ResultTaggedNotificationService.name);

  /** Both tagged types, for the "already told this user about this result" check. */
  private static readonly TAGGED_TYPES = [
    NotificationTypeEnum.RESULT_CENTER_TAGGED,
    NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED,
  ];

  constructor(
    private readonly _notificationService: NotificationService,
    private readonly _notificationRepository: NotificationRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    @InjectRepository(Result)
    private readonly resultRepo: Repository<Result>,
    @InjectRepository(ClarisaCenter)
    private readonly centerRepo: Repository<ClarisaCenter>,
    @InjectRepository(ClarisaProject)
    private readonly projectRepo: Repository<ClarisaProject>,
    @InjectRepository(ResultsCenter)
    private readonly resultsCenterRepo: Repository<ResultsCenter>,
    @InjectRepository(ResultsByProjects)
    private readonly resultsByProjectsRepo: Repository<ResultsByProjects>,
  ) {}

  /**
   * AC1 — centres tagged as lead or contributor. Callers pass only the codes that were *newly*
   * linked, so re-saving the partners section does not notify the same centre twice.
   */
  async notifyTaggedCenters(
    resultId: number,
    emitterUserId: number,
    centerCodes: string[],
  ): Promise<void> {
    const codes = [...new Set((centerCodes ?? []).filter(Boolean))];
    if (!codes.length) return;

    const centers = await this.centerRepo.find({
      where: { code: In(codes) },
      relations: { clarisa_institution: true },
    });

    const targets: TaggedTarget[] = codes.map((code) => {
      const center = centers.find((c) => c.code === code);
      return {
        centerCode: code,
        label: center?.clarisa_institution?.name ?? code,
        type: NotificationTypeEnum.RESULT_CENTER_TAGGED,
      };
    });

    await this.emitFor(resultId, emitterUserId, targets);
  }

  /**
   * AC2 — bilateral projects newly associated with the result. The notification goes to the
   * centre that owns the project, so the project id has to be resolved to a centre code first.
   */
  async notifyTaggedBilateralProjects(
    resultId: number,
    emitterUserId: number,
    projectIds: Array<number | string>,
  ): Promise<void> {
    const ids = [
      ...new Set(
        (projectIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
    if (!ids.length) return;

    const projects = await this.projectRepo.find({ where: { id: In(ids) } });
    const centerIndex = await this.loadCenterIndex();
    const targets: TaggedTarget[] = [];

    for (const project of projects) {
      const centerCode =
        resolveProjectOwnerCenter(project, centerIndex)?.code ?? null;
      if (!centerCode) {
        this.logger.warn(
          `No owning centre resolved for bilateral project ${project.id} — skipping its tagged-project notification`,
        );
        continue;
      }
      targets.push({
        centerCode,
        label: project.shortName ?? project.fullName ?? `project ${project.id}`,
        type: NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED,
      });
    }

    await this.emitFor(resultId, emitterUserId, targets);
  }

  /**
   * BCT-T-4 (forward pointer from BCT-T-1) — notifies the Center Users of every owning Center of
   * a bilateral result's contributing bilateral projects and hand-tagged contributing Centers,
   * once the result reaches Pending Review (BCT-R-7..R-11). Projects are targeted first so a
   * Center that is both a derived contributing Center and a project owner gets the project text,
   * never both (BCT-R-9, DD-5) — `emitFor`'s existing per-user dedup enforces that from ordering
   * alone.
   *
   * Never throws (BCT-NFR-1): a failure here must not affect the submit or ingest that already
   * committed the status change.
   */
  // @akili-spec notifications/bilateral-contributor-tagging
  async notifyBilateralContributorsOnSubmission(
    resultId: number,
    emitterUserId: number,
  ): Promise<void> {
    try {
      const result = await this.resultRepo.findOne({
        where: { id: resultId },
        select: ['id', 'status_id', 'source'],
      });
      if (
        !result ||
        Number(result.status_id) !== ResultStatusData.PendingReview.value ||
        result.source !== SourceEnum.Bilateral
      ) {
        return;
      }

      const centerRows = await this.resultsCenterRepo.find({
        where: { result_id: resultId, is_active: true },
        relations: { clarisa_center_object: { clarisa_institution: true } },
      });
      const leadingRow = centerRows.find((row) => row.is_leading_result);

      const reportingCenterLabel =
        leadingRow?.clarisa_center_object?.clarisa_institution?.acronym ||
        leadingRow?.clarisa_center_object?.code ||
        null;
      if (!reportingCenterLabel) {
        this.logger.warn(
          `No reporting Center resolved for bilateral result ${resultId} — using the degraded lead-in`,
        );
      }
      const leadIn = `reported by ${reportingCenterLabel || 'a CGIAR Center'}`;

      const targets: TaggedTarget[] = [];

      // Project targets first (BCT-R-7, DD-5): active, non-lead bilateral projects, resolved to
      // their owning Center via the shared BCT-DD-1 resolver.
      const projectRows = await this.resultsByProjectsRepo.find({
        where: { result_id: resultId, is_active: true },
        relations: { obj_clarisa_project: true },
      });
      const centerIndex = await this.loadCenterIndex();

      for (const projectRow of projectRows.filter((row) => !row.is_lead)) {
        const project = projectRow.obj_clarisa_project;
        const centerCode = project
          ? (resolveProjectOwnerCenter(project, centerIndex)?.code ?? null)
          : null;
        if (!centerCode) {
          this.logger.warn(
            `No owning centre resolved for bilateral project ${projectRow.project_id} on result ${resultId} — skipping its tagged-project notification`,
          );
          continue;
        }
        targets.push({
          centerCode,
          label: `${
            project.shortName ?? project.fullName ?? `project ${project.id}`
          } of your center`,
          type: NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED,
        });
      }

      // Center targets (BCT-R-8): active, non-leading contributing Centers, tagged by hand or
      // derived — same label rule as `notifyTaggedCenters`.
      for (const centerRow of centerRows.filter(
        (row) => !row.is_leading_result,
      )) {
        targets.push({
          centerCode: centerRow.center_id,
          label:
            centerRow.clarisa_center_object?.clarisa_institution?.name ??
            centerRow.center_id,
          type: NotificationTypeEnum.RESULT_CENTER_TAGGED,
        });
      }

      await this.emitFor(resultId, emitterUserId, targets, leadIn);
    } catch (error) {
      this.logger.warn(
        `Failed to emit bilateral tagging notifications for result ${resultId}: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
    }
  }

  /**
   * Loads the small `clarisa_center` table (~15 rows) once and builds the in-memory index the
   * BCT-DD-1 resolver reads from. Never call this inside a per-project loop (BCT-NFR-5).
   */
  private async loadCenterIndex(): Promise<CenterIndex> {
    const centers = await this.centerRepo.find();
    return buildCenterIndex(centers);
  }

  /**
   * Resolves recipients, drops anyone already told about this result, and emits one notification
   * per remaining centre.
   *
   * BR4 is implemented as "one per affected organisation", not one per link: a centre that is both
   * the lead and the owner of a tagged project hears once. The de-duplication is done on the
   * recipient rather than on the centre because that is the unit that actually matters for the
   * bell, and because it also covers the case of a second tag arriving in a later request.
   *
   * BCT-R-12 / design §5.4 — `leadIn` is an optional last parameter. When it is absent, the text
   * is exactly what it always was: `created by ${programCode ?? 'a Science Program'}`, with
   * `programCode` computed only in that branch. When a caller passes one (bilateral submissions,
   * BCT-R-7/R-8), it replaces that whole clause verbatim — the suffix template past it is
   * unchanged either way.
   */
  private async emitFor(
    resultId: number,
    emitterUserId: number,
    targets: TaggedTarget[],
    leadIn?: string,
  ): Promise<void> {
    if (!targets.length) return;

    const result = await this.resultRepo.findOne({
      where: { id: resultId },
      relations: { obj_result_by_initiatives: { obj_initiative: true } },
    });
    if (!result) {
      this.logger.warn(
        `Result ${resultId} not found — skipping tagged notifications`,
      );
      return;
    }

    const resolvedLeadIn =
      leadIn ??
      `created by ${this.resolveOwnerProgramCode(result) ?? 'a Science Program'}`;
    const alreadyNotified = await this.getAlreadyNotifiedUserIds(resultId);

    for (const target of targets) {
      const userIds = (
        await this._roleByUserRepository.getUserIdsByCenter(target.centerCode)
      ).filter((id) => !alreadyNotified.has(id));

      if (!userIds.length) continue;

      // AC3, minus the identity the readers prepend themselves.
      const suffix = `${resolvedLeadIn} has tagged the ${target.label}. Click to see the result.`;

      await this._notificationService.emitResultNotification(
        NotificationLevelEnum.RESULT,
        target.type,
        userIds,
        emitterUserId,
        resultId,
        suffix,
      );

      // Within one call, a centre that appears twice (lead + project owner) must not notify the
      // same people again.
      userIds.forEach((id) => alreadyNotified.add(id));
    }
  }

  private async getAlreadyNotifiedUserIds(
    resultId: number,
  ): Promise<Set<number>> {
    const existing = await this._notificationRepository.find({
      select: { target_user: true },
      where: {
        result_id: resultId,
        obj_notification_type: {
          type: In(ResultTaggedNotificationService.TAGGED_TYPES),
        },
      },
      relations: { obj_notification_type: true },
    });

    return new Set(
      existing
        .map((row) => Number(row.target_user))
        .filter((id) => Number.isFinite(id)),
    );
  }

  private resolveOwnerProgramCode(result: Result): string | undefined {
    const initiatives = result?.obj_result_by_initiatives;
    if (!Array.isArray(initiatives)) return undefined;

    // `initiative_role_id = 1` is the owning entity; the same row the notification read paths
    // filter on.
    const owner =
      initiatives.find((i) => Number(i?.initiative_role_id) === 1) ??
      initiatives[0];
    return owner?.obj_initiative?.official_code ?? undefined;
  }
}
