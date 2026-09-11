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
import { Result } from '../../results/entities/result.entity';
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaProject } from '../../../clarisa/clarisa-projects/entity/clarisa-projects.entity';
import { W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE } from '../../bilateral/constants/w3-center-alias.constants';

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
    const targets: TaggedTarget[] = [];

    for (const project of projects) {
      const centerCode = await this.resolveProjectCenterCode(project);
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
   * `clarisa_projects.organization_code` → `clarisa_center.institutionId` → `code`.
   *
   * The inverse of what `BilateralProjectsService.getProjectsByCenter` does, including the same
   * fallback: CLARISA's own W3 institution-acronym matching leaves some rows with
   * `organization_code = NULL`, and those carry the acronym instead. See
   * `w3-center-alias.constants.ts` for why that only bites the Alliance-descended institutions.
   */
  private async resolveProjectCenterCode(
    project: ClarisaProject,
  ): Promise<string | null> {
    if (project.organizationCode != null) {
      const center = await this.centerRepo.findOne({
        where: { institutionId: Number(project.organizationCode) },
      });
      if (center?.code) return center.code;
    }

    const acronym = project.sourceCenterAcronym;
    if (acronym && W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE[acronym]) {
      return W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE[acronym];
    }

    return null;
  }

  /**
   * Resolves recipients, drops anyone already told about this result, and emits one notification
   * per remaining centre.
   *
   * BR4 is implemented as "one per affected organisation", not one per link: a centre that is both
   * the lead and the owner of a tagged project hears once. The de-duplication is done on the
   * recipient rather than on the centre because that is the unit that actually matters for the
   * bell, and because it also covers the case of a second tag arriving in a later request.
   */
  private async emitFor(
    resultId: number,
    emitterUserId: number,
    targets: TaggedTarget[],
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

    const programCode = this.resolveOwnerProgramCode(result);
    const alreadyNotified = await this.getAlreadyNotifiedUserIds(resultId);

    for (const target of targets) {
      const userIds = (
        await this._roleByUserRepository.getUserIdsByCenter(target.centerCode)
      ).filter((id) => !alreadyNotified.has(id));

      if (!userIds.length) continue;

      // AC3, minus the identity the readers prepend themselves.
      const suffix = `created by ${programCode ?? 'a Science Program'} has tagged the ${target.label}. Click to see the result.`;

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
