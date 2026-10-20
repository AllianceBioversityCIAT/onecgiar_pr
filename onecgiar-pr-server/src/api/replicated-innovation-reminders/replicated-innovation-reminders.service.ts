// @akili-spec changes/replicated-innovation-reminders
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { env } from 'node:process';
import { Not, Repository } from 'typeorm';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { GlobalParameterRepository } from '../global-parameter/repositories/global-parameter.repository';
import { Version } from '../versioning/entities/version.entity';
import { buildDigests } from './digest-builder';
import {
  CampaignListView,
  CampaignView,
  PreviewView,
  SendView,
  toCampaignView,
  toPreviewView,
  toSendView,
} from './dto/campaign-view';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import {
  ReplicatedInnovationReminderCampaign,
  ReplicatedReminderStatus,
} from './entities/replicated-innovation-reminder-campaign.entity';
import { PendingInnovationRepository } from './repositories/pending-innovation.repository';
import { ReminderCampaignRepository } from './repositories/reminder-campaign.repository';
import {
  EMPTY_TEST_RECIPIENT_ERROR,
  ReminderDispatcher,
} from './reminder-dispatcher.service';

const TEST_RECIPIENT_PARAM = 'rir_test_recipient_email';

/**
 * `RIR-T-5` — admin operations over the campaigns (design §4). The send itself lives in
 * `ReminderDispatcher`; this service owns the rules the dispatcher does not: the future-date and
 * duplicate-kind rules (`RIR-R-5`), the frozen states, the active-phase guard (T-4 advisory 7) and
 * the HTTP mapping of a dispatch outcome.
 *
 * Errors are thrown as Nest `HttpException`s (the global `HttpExceptionFilter` renders them).
 * Nothing here logs: messages never carry an address (AC-9).
 */
@Injectable()
export class ReplicatedInnovationRemindersService {
  constructor(
    private readonly _campaignRepository: ReminderCampaignRepository,
    private readonly _pendingRepository: PendingInnovationRepository,
    private readonly _dispatcher: ReminderDispatcher,
    private readonly _globalParameterRepository: GlobalParameterRepository,
    @InjectRepository(Version)
    private readonly _versionRepository: Repository<Version>,
  ) {}

  /** Campaigns of the active Reporting phase plus the live pending / unreachable totals (`RIR-R-15`). */
  async list(): Promise<CampaignListView> {
    const phase = await this.activePhase();
    const campaigns = await this._campaignRepository.find({
      where: { version_id: phase.id },
      order: { scheduled_at: 'ASC', id: 'ASC' },
    });
    const rows = await this._pendingRepository.findPending(Number(phase.id));
    // Reachability depends on the lead only, so the CC lookup is not needed for a count.
    const { unreachable } = buildDigests(rows, new Map());
    return {
      phase: {
        id: Number(phase.id),
        phase_name: phase.phase_name,
        phase_year: phase.phase_year,
      },
      campaigns: campaigns.map(toCampaignView),
      pending_total: rows.length,
      unreachable_total: unreachable.length,
    };
  }

  async create(dto: CreateCampaignDto, userId?: number): Promise<CampaignView> {
    const phase = await this.activePhase();
    const scheduledAt = this.parseFuture(dto.scheduled_at);

    const duplicate = await this._campaignRepository.findOne({
      where: {
        version_id: phase.id,
        kind: dto.kind,
        status: Not(ReplicatedReminderStatus.CANCELLED),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        `A ${dto.kind} campaign already exists for this phase; cancel it before creating another`,
      );
    }

    const saved = await this._campaignRepository.save(
      this._campaignRepository.create({
        version_id: phase.id,
        kind: dto.kind,
        scheduled_at: scheduledAt,
        status: ReplicatedReminderStatus.PENDING,
        created_by: userId,
      }),
    );
    return toCampaignView(saved);
  }

  async updateDate(
    id: number,
    dto: UpdateCampaignDto,
    userId?: number,
  ): Promise<CampaignView> {
    const campaign = await this.getOrFail(id);
    await this.assertActivePhase(campaign);
    const scheduledAt = this.parseFuture(dto.scheduled_at);
    return this.changeWhilePending(id, {
      scheduled_at: scheduledAt,
      last_updated_by: userId,
    });
  }

  async cancel(id: number, userId?: number): Promise<CampaignView> {
    await this.getOrFail(id);
    return this.changeWhilePending(id, {
      status: ReplicatedReminderStatus.CANCELLED,
      last_updated_by: userId,
    });
  }

  /** Dry run (`RIR-R-9`): no claim, no log, no email. */
  async preview(id: number): Promise<PreviewView> {
    const campaign = await this.getOrFail(id);
    this.assertSendable(campaign);
    await this.assertActivePhase(campaign);
    const outcome = await this._dispatcher.dispatch(id, { dryRun: true });
    if (outcome.result === 'NOT_FOUND') {
      throw new NotFoundException('Campaign not found');
    }
    return toPreviewView(outcome);
  }

  /** Send now (`RIR-R-7`): the same dispatch the cron runs, with a retry of a FAILED campaign allowed. */
  async send(id: number): Promise<SendView> {
    const campaign = await this.getOrFail(id);
    this.assertSendable(campaign);
    await this.assertActivePhase(campaign);
    await this.assertTestRecipientConfigured();

    const outcome = await this._dispatcher.dispatch(id, {
      dryRun: false,
      allowRetry: true,
    });
    switch (outcome.result) {
      case 'CLAIM_LOST':
        throw new ConflictException(
          'Another run already owns this campaign; refresh and check its status',
        );
      case 'NOT_SAVED':
        throw new ConflictException(
          'The campaign changed while sending and its result could not be saved; refresh and check its status',
        );
      case 'NOT_FOUND':
        throw new NotFoundException('Campaign not found');
      default:
        break;
    }
    // Race-safe fallback: the precondition above passed but the parameter was emptied meanwhile.
    if (
      outcome.status === ReplicatedReminderStatus.FAILED &&
      outcome.last_error === EMPTY_TEST_RECIPIENT_ERROR
    ) {
      throw this.noTestRecipient();
    }
    return toSendView(outcome);
  }

  // --- internals ---------------------------------------------------------------------------

  private async getOrFail(
    id: number,
  ): Promise<ReplicatedInnovationReminderCampaign> {
    const campaign = await this._campaignRepository.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  /**
   * UPDATE guarded on `status = PENDING` so an edit can never overwrite a claim that won the race
   * (SENT / SENDING / FAILED / CANCELLED are frozen for edits, `RIR-R-5`).
   */
  private async changeWhilePending(
    id: number,
    patch: Partial<ReplicatedInnovationReminderCampaign>,
  ): Promise<CampaignView> {
    const result = await this._campaignRepository.update(
      { id, status: ReplicatedReminderStatus.PENDING },
      patch,
    );
    if (!result.affected) {
      throw new ConflictException(
        'Only a PENDING campaign can be edited or cancelled',
      );
    }
    return toCampaignView(await this.getOrFail(id));
  }

  /** The preview needs this refusal itself because a dry run skips the claim. */
  private assertSendable(campaign: ReplicatedInnovationReminderCampaign): void {
    const allowed = [
      ReplicatedReminderStatus.PENDING,
      ReplicatedReminderStatus.FAILED,
    ];
    if (!allowed.includes(campaign.status)) {
      throw new ConflictException(
        `A ${campaign.status} campaign cannot be previewed or sent`,
      );
    }
  }

  private async activePhase(): Promise<Version> {
    const phase = await this._versionRepository.findOne({
      where: {
        status: true,
        is_active: true,
        app_module_id: AppModuleIdEnum.REPORTING,
      },
    });
    if (!phase) {
      throw new NotFoundException('There is no active Reporting phase');
    }
    return phase;
  }

  /** T-4 advisory 7: a campaign of a closed phase must not email on the active phase's behalf. */
  private async assertActivePhase(
    campaign: ReplicatedInnovationReminderCampaign,
  ): Promise<void> {
    const phase = await this.activePhase();
    if (Number(phase.id) !== Number(campaign.version_id)) {
      throw new ConflictException(
        'This campaign belongs to a phase that is no longer the active Reporting phase',
      );
    }
  }

  /**
   * Non-production only. Checked BEFORE the dispatch so a missing test address is refused without
   * claiming: the campaign stays PENDING instead of ending FAILED with nothing sent.
   */
  private async assertTestRecipientConfigured(): Promise<void> {
    if (env.IS_PRODUCTION === 'true') return;
    const record = await this._globalParameterRepository.findOne({
      where: { name: TEST_RECIPIENT_PARAM },
      select: { value: true },
    });
    if (!(record?.value ?? '').trim()) throw this.noTestRecipient();
  }

  private noTestRecipient(): HttpException {
    return new HttpException(
      'Non-production send needs a test recipient: set the rir_test_recipient_email global parameter',
      HttpStatus.PRECONDITION_FAILED,
    );
  }

  private parseFuture(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      throw new BadRequestException('scheduled_at must be a future UTC date');
    }
    return date;
  }
}
