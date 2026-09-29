import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { EntityManager, In, LessThan, Not, Repository } from 'typeorm';
import { selectManager } from '../../../shared/utils/orm.util';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ClarisaCentersRepository } from '../../../clarisa/clarisa-centers/clarisa-centers.repository';
import { Result, SourceEnum } from '../../results/entities/result.entity';
import { ResultCreationMethod } from '../../../shared/constants/result-creation-method.enum';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { VersioningService } from '../../versioning/versioning.service';
import { YearRepository } from '../../results/years/year.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { BilateralAiProcessingQueuePublisherService } from '../../../shared/microservices/bilateral-ai-processing-queue/bilateral-ai-processing-queue-publisher.service';
import { BilateralAiFileStorageService } from './bilateral-ai-file-storage.service';
import { BilateralAiTextMiningService } from './bilateral-ai-text-mining.service';
import {
  BilateralAiJob,
  BilateralAiJobStatus,
} from '../entities/bilateral-ai-job.entity';
import { BilateralAiDraft } from '../entities/bilateral-ai-draft.entity';
import {
  DraftEvidence,
  DraftEvidenceSourceType,
} from '../entities/draft-evidence.entity';
import { CreateBilateralAiJobDto } from '../dto/create-bilateral-ai-job.dto';
import { BilateralService } from '../../bilateral/bilateral.service';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ClarisaProjectsRepository } from '../../../clarisa/clarisa-projects/clarisa-projects.repository';
import {
  getBilateralAiMaxAttempts,
  getBilateralAiMaxConcurrent,
  getBilateralAiMaxPerUser,
  bilateralAiDbNow,
} from '../bilateral-ai.config';
import { BilateralAiNotificationsService } from './bilateral-ai-notifications.service';
import { BilateralAiEvidenceTransferService } from './bilateral-ai-evidence-transfer.service';
import { BilateralAiDispatchService } from './bilateral-ai-dispatch.service';
import {
  BilateralAiExpectationsMix,
  BilateralAiExpectationsResponseDto,
} from '../dto/bilateral-ai-expectations.dto';
import { isQualifyingEvidenceDocument } from '../constants/evidence-formats.constant';

/**
 * The complete server `stage` vocabulary (`design.md` §3.1, `requirements.md` §2 Glossary).
 * Nothing else is ever written to `BilateralAiJob.stage`.
 */
export const BilateralAiJobStage = {
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  READING: 'reading',
  TRANSCRIBING: 'transcribing',
  READING_TRANSCRIBING: 'reading_transcribing',
  EXTRACTING: 'extracting',
  VALIDATING: 'validating',
  CREATING_DRAFTS: 'creating_drafts',
} as const;

const TYPE_BY_INDICATOR: Record<string, { type: number; level: number }> = {
  'Policy Change': { type: 1, level: 3 },
  'Innovation Use': { type: 2, level: 3 },
  'Other Outcome': { type: 4, level: 3 },
  'Capacity Sharing for Development': { type: 5, level: 4 },
  // Knowledge Product is listed for completeness, but the text-mining/model
  // pipeline does not identify Knowledge Products, so this entry is never hit
  // in practice (see the guard in createDraftFromCandidate).
  'Knowledge Product': { type: 6, level: 4 },
  'Innovation Development': { type: 7, level: 4 },
  'Other Output': { type: 8, level: 4 },
};

@Injectable()
export class BilateralAiService {
  private readonly logger = new Logger(BilateralAiService.name);

  /** `APF-R-21` SHOULD — 10-minute in-memory cache per mix class, keyed on the process's own
   * singleton instance of this service (`getExpectations`). */
  private readonly expectationsCache = new Map<
    string,
    { data: BilateralAiExpectationsResponseDto; expiresAt: number }
  >();
  private static readonly EXPECTATIONS_CACHE_MS = 10 * 60_000;
  private static readonly EXPECTATIONS_SAMPLE_WINDOW_MS = 90 * 24 * 60 * 60_000;
  private static readonly EXPECTATIONS_MIN_SAMPLE_SIZE = 5;

  constructor(
    @InjectRepository(BilateralAiJob)
    private readonly jobRepository: Repository<BilateralAiJob>,
    @InjectRepository(BilateralAiDraft)
    private readonly draftRepository: Repository<BilateralAiDraft>,
    @InjectRepository(DraftEvidence)
    private readonly evidenceRepository: Repository<DraftEvidence>,
    @InjectRepository(Result)
    private readonly resultRepository: Repository<Result>,
    private readonly versioningService: VersioningService,
    private readonly yearRepository: YearRepository,
    private readonly resultsByProjectsRepository: ResultsByProjectsRepository,
    private readonly queue: BilateralAiProcessingQueuePublisherService,
    private readonly storage: BilateralAiFileStorageService,
    private readonly textMining: BilateralAiTextMiningService,
    private readonly bilateralService: BilateralService,
    private readonly userRepository: UserRepository,
    private readonly roleByUserRepository: RoleByUserRepository,
    private readonly clarisaCentersRepository: ClarisaCentersRepository,
    private readonly clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    // `AIQ-T-4`: `design.md` §4.1 list item `project_name` — already resolvable here via
    // `ClarisaProjectsModule`, imported by `bilateral.module.ts` for `BilateralService`'s own use
    // (`findProjectByGrantTitle`), so no new module import is needed.
    private readonly clarisaProjectsRepository: ClarisaProjectsRepository,
    private readonly notificationsService: BilateralAiNotificationsService,
    private readonly evidenceTransferService: BilateralAiEvidenceTransferService,
    // `AIQ-T-3`: `BilateralAiDispatchService` already depends on this service (`attemptStart`,
    // `AIQ-T-2`), so the reverse edge needed to call `wake` from `processJob`'s terminal paths
    // makes the two providers mutually dependent within `bilateral.module.ts`. `forwardRef` on
    // this side (and the matching one in `bilateral-ai-dispatch.service.ts`) is the standard Nest
    // resolution for two providers in the same module depending on each other.
    @Inject(forwardRef(() => BilateralAiDispatchService))
    private readonly dispatchService: BilateralAiDispatchService,
  ) {}

  async createJob(
    dto: CreateBilateralAiJobDto,
    documents: any[],
    audio: any[],
    user: TokenDto,
  ) {
    if (!this.queue.isEnabled()) {
      throw new ServiceUnavailableException(
        'Bilateral AI processing queue is not configured.',
      );
    }
    const text = dto.text?.trim() || undefined;
    this.storage.validateSources(documents, audio, text);
    const jobId = randomUUID();
    const uploaded = await this.storage.uploadFiles(jobId, [
      ...documents,
      ...audio,
    ]);
    const documentKeys = uploaded
      .slice(0, documents.length)
      .map((file) => file.key);
    const audioKeys = uploaded.slice(documents.length).map((file) => file.key);
    const job = await this.jobRepository.save(
      this.jobRepository.create({
        job_id: jobId,
        user_id: user.id,
        center_id: dto.center_id,
        project_id: dto.project_id,
        program_code: dto.program_code,
        bucket_name: this.storage.getBucketName(),
        document_keys: documentKeys,
        audio_keys: audioKeys,
        text_context: text ?? null,
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        result_count: 0,
        external_interaction_id: null,
        response_snapshot: null,
        error_code: null,
        error_message: null,
        started_date: null,
        completed_date: null,
      }),
    );
    try {
      this.queue.publish({ jobId: job.job_id });
    } catch (error) {
      await this.jobRepository.update(job.job_id, {
        status: BilateralAiJobStatus.FAILED,
        error_code: 'QUEUE_NOT_AVAILABLE',
        error_message: 'The AI processing queue could not accept the job.',
        completed_date: bilateralAiDbNow,
      });
      throw error;
    }
    return {
      response: { jobId: job.job_id, jobStatus: job.status },
      message: 'AI job created successfully',
      status: 202,
    };
  }

  /**
   * `AIQ-T-4` — `design.md` §5.5, `AIQ-DD-4`: `jobs_ahead` counts only `PENDING` jobs whose
   * queue-entry clock is older than this one (a running job is never "ahead" in a lane model, so
   * older `PROCESSING` rows no longer count — this narrows the pre-`AIQ` `queue_position`
   * definition). `wait_reason` is `own_job_running` when the owner is already at the per-user
   * cap, else `no_free_lane` when the global lane cap is full, else `starting`. One helper feeds
   * both `getJob` and `listJobs` so the two reads cannot drift (`AIQ-R-6` B).
   */
  private async computeQueueWait(
    ownerId: number,
    queueEntryDate: Date,
  ): Promise<{
    jobs_ahead: number;
    wait_reason: 'own_job_running' | 'no_free_lane' | 'starting';
  }> {
    const [jobs_ahead, ownerProcessingCount] = await Promise.all([
      this.jobRepository.count({
        where: {
          status: BilateralAiJobStatus.PENDING,
          queue_entry_date: LessThan(queueEntryDate),
        },
      }),
      this.jobRepository.count({
        where: { status: BilateralAiJobStatus.PROCESSING, user_id: ownerId },
      }),
    ]);

    if (ownerProcessingCount >= getBilateralAiMaxPerUser()) {
      return { jobs_ahead, wait_reason: 'own_job_running' };
    }

    const globalProcessingCount = await this.jobRepository.count({
      where: { status: BilateralAiJobStatus.PROCESSING },
    });
    const wait_reason =
      globalProcessingCount >= getBilateralAiMaxConcurrent()
        ? 'no_free_lane'
        : 'starting';
    return { jobs_ahead, wait_reason };
  }

  /**
   * `APF-R-1` A / `AIQ-DD-4`: `queue_position` (kept, `AIQ-R-6` B) is now defined as `jobs_ahead`
   * — computed at read time, never stored, meaningful only while this job is `PENDING`
   * (`design.md` §4.1, §4.2). `wait_reason` is additive, also `PENDING`-only.
   */
  async getJob(jobId: string, userId: number) {
    const job = await this.jobRepository.findOne({
      where: { job_id: jobId, user_id: userId },
    });
    if (!job) throw new NotFoundException('AI job not found.');

    let jobs_ahead: number | null = null;
    let wait_reason: string | null = null;
    if (job.status === BilateralAiJobStatus.PENDING) {
      const wait = await this.computeQueueWait(
        job.user_id,
        job.queue_entry_date,
      );
      jobs_ahead = wait.jobs_ahead;
      wait_reason = wait.wait_reason;
    }

    return {
      response: {
        ...job,
        queue_position: jobs_ahead,
        jobs_ahead,
        wait_reason,
        max_attempts: getBilateralAiMaxAttempts(),
      },
      message: 'AI job found',
      status: 200,
    };
  }

  /**
   * `AIQ-T-4` — `GET /api/bilateral/center/ai/jobs` (`design.md` §4.1): the caller's active jobs
   * (`PENDING`/`PROCESSING`, unbounded) plus jobs finished in the last 24 h (max 10, newest
   * first), each carrying exactly the §4.1 key set plus a `summary` of global lane usage.
   *
   * The 24 h cutoff and the finished-job ordering run in SQL (`DATE_SUB(NOW(), INTERVAL 24
   * HOUR)`) — never a JS `Date` (`bilateral-ai.config.ts`'s timezone-skew note: `completed_date`
   * is written in the DB's session time zone, `NOW()` is evaluated there too, but a JS `Date`
   * instant is process-zone).
   *
   * `bucket_name`, `document_keys`, `audio_keys`, `text_context`, `response_snapshot`,
   * `error_message` and `user_id` are deliberately excluded from every item (§4.1 "Excluded from
   * the list on purpose") — the explicit key set below, never an entity spread, is what keeps
   * them out.
   */
  async listJobs(user: TokenDto) {
    const userId = user.id;

    const activeJobs = await this.jobRepository.find({
      where: {
        user_id: userId,
        status: In([
          BilateralAiJobStatus.PENDING,
          BilateralAiJobStatus.PROCESSING,
        ]),
      },
      order: { queue_entry_date: 'DESC' },
    });

    const finishedJobs = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.user_id = :userId', { userId })
      .andWhere('job.status IN (:...statuses)', {
        statuses: [BilateralAiJobStatus.COMPLETED, BilateralAiJobStatus.FAILED],
      })
      .andWhere('job.completed_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)')
      .orderBy('job.completed_date', 'DESC')
      .limit(10)
      .getMany();

    const jobs = [...activeJobs, ...finishedJobs].sort(
      (a, b) =>
        new Date(b.queue_entry_date).getTime() -
        new Date(a.queue_entry_date).getTime(),
    );

    const lanesBusy = await this.jobRepository.count({
      where: { status: BilateralAiJobStatus.PROCESSING },
    });
    const othersWaiting = await this.jobRepository.count({
      where: { status: BilateralAiJobStatus.PENDING, user_id: Not(userId) },
    });

    const projectIds = [...new Set(jobs.map((job) => job.project_id))];
    const centerIds = [...new Set(jobs.map((job) => job.center_id))];
    const [projects, institutions] = await Promise.all([
      projectIds.length
        ? this.clarisaProjectsRepository.find({ where: { id: In(projectIds) } })
        : Promise.resolve([]),
      centerIds.length
        ? this.clarisaInstitutionsRepository.find({
            where: { id: In(centerIds) },
          })
        : Promise.resolve([]),
    ]);
    const projectNameById = new Map(
      projects.map((project) => [
        Number(project.id),
        project.fullName?.trim() || project.shortName || null,
      ]),
    );
    const centerAcronymById = new Map(
      institutions.map((institution) => [
        Number(institution.id),
        institution.acronym ?? null,
      ]),
    );

    const items = await Promise.all(
      jobs.map(async (job) => {
        let jobs_ahead: number | null = null;
        let wait_reason: string | null = null;
        if (job.status === BilateralAiJobStatus.PENDING) {
          const wait = await this.computeQueueWait(
            job.user_id,
            job.queue_entry_date,
          );
          jobs_ahead = wait.jobs_ahead;
          wait_reason = wait.wait_reason;
        }

        return {
          job_id: job.job_id,
          status: job.status,
          stage: job.stage,
          stage_updated_date: job.stage_updated_date,
          project_id: job.project_id,
          project_name: projectNameById.get(Number(job.project_id)) ?? null,
          program_code: job.program_code,
          center_id: job.center_id,
          center_acronym: centerAcronymById.get(Number(job.center_id)) ?? null,
          document_count: job.document_keys?.length ?? 0,
          audio_count: job.audio_keys?.length ?? 0,
          has_text: Boolean(
            job.text_context && job.text_context.trim().length > 0,
          ),
          queue_entry_date: job.queue_entry_date,
          started_date: job.started_date,
          completed_date: job.completed_date,
          result_count: job.result_count,
          error_code: job.error_code,
          attempts: job.attempts,
          max_attempts: getBilateralAiMaxAttempts(),
          retrying: job.retrying,
          jobs_ahead,
          wait_reason,
        };
      }),
    );

    return {
      response: {
        jobs: items,
        summary: {
          lanes_total: getBilateralAiMaxConcurrent(),
          lanes_busy: lanesBusy,
          others_waiting: othersWaiting,
        },
      },
      message: 'AI jobs found',
      status: 200,
    };
  }

  /**
   * `POST /api/bilateral/center/ai/jobs/:jobId/retry` — idempotent "Try again" (`APF-R-5`,
   * `design.md` §5 "Retry endpoint"). Order: queue-configured guard (503, same as `createJob`) →
   * owner check (403) → status check (409 `JOB_ALIVE` while PENDING/PROCESSING, 409
   * `JOB_COMPLETED` when COMPLETED) → `HEAD` each stored S3 key, 410 `SOURCES_GONE` on the first
   * miss (no re-upload — the same keys are reused) → conditional reset scoped to
   * `status = FAILED` (0 rows means another actor moved the job between the read and this write —
   * 409 `JOB_ALIVE`) → publish. `retried_date = now` moves `queue_entry_date` to the retry
   * moment; `created_date` is left untouched for provenance.
   */
  async retryJob(jobId: string, user: TokenDto) {
    if (!this.queue.isEnabled()) {
      throw new ServiceUnavailableException(
        'Bilateral AI processing queue is not configured.',
      );
    }
    const job = await this.jobRepository.findOne({ where: { job_id: jobId } });
    if (!job) throw new NotFoundException('AI job not found.');
    if (job.user_id !== user.id) {
      throw new ForbiddenException('You do not have access to this AI job.');
    }
    if (
      job.status === BilateralAiJobStatus.PENDING ||
      job.status === BilateralAiJobStatus.PROCESSING
    ) {
      throw new HttpException(
        {
          code: 'JOB_ALIVE',
          message: 'This AI job is still running; wait for it to finish.',
        },
        HttpStatus.CONFLICT,
      );
    }
    if (job.status === BilateralAiJobStatus.COMPLETED) {
      throw new HttpException(
        { code: 'JOB_COMPLETED', message: 'This AI job already completed.' },
        HttpStatus.CONFLICT,
      );
    }

    // `APF-R-5`: no re-upload — the stored S3 keys are reused, but a key can have expired or been
    // removed since the job failed, in which case the user must upload again (410).
    const storedKeys = [
      ...(job.document_keys ?? []),
      ...(job.audio_keys ?? []),
    ];
    for (const key of storedKeys) {
      const exists = await this.storage.keyExists(key);
      if (!exists) {
        throw new HttpException(
          {
            code: 'SOURCES_GONE',
            message:
              'One or more of your uploaded files are no longer available. Please upload again.',
          },
          HttpStatus.GONE,
        );
      }
    }

    // `stage_updated_date` and `retried_date` share `bilateralAiDbNow`: MySQL evaluates
    // `CURRENT_TIMESTAMP` once per statement, so both columns land on the exact same DB-time
    // instant within this single UPDATE — the same consistency a shared JS `now` gave before.
    const reset = await this.jobRepository.update(
      { job_id: jobId, status: BilateralAiJobStatus.FAILED },
      {
        status: BilateralAiJobStatus.PENDING,
        stage: BilateralAiJobStage.QUEUED,
        stage_updated_date: bilateralAiDbNow,
        attempts: 0,
        retrying: false,
        error_code: null,
        error_message: null,
        started_date: null,
        completed_date: null,
        retried_date: bilateralAiDbNow,
      },
    );
    if (!reset?.affected) {
      // Another actor (the sweeper, or a second retry request) moved the job between the read
      // above and this write (`design.md` §5 "Retry endpoint").
      throw new HttpException(
        {
          code: 'JOB_ALIVE',
          message: 'This AI job changed status; refresh and try again.',
        },
        HttpStatus.CONFLICT,
      );
    }

    try {
      this.queue.publish({ jobId });
    } catch (error) {
      await this.jobRepository.update(jobId, {
        status: BilateralAiJobStatus.FAILED,
        error_code: 'QUEUE_NOT_AVAILABLE',
        error_message: 'The AI processing queue could not accept the job.',
        completed_date: bilateralAiDbNow,
      });
      throw error;
    }

    return {
      response: { jobId, jobStatus: BilateralAiJobStatus.PENDING },
      message: 'AI job re-queued for retry',
      status: 202,
    };
  }

  /**
   * `GET /api/bilateral/center/ai/expectations?mix=documents|audio` (`APF-R-6` D, `APF-R-21`,
   * `design.md` §5 "Expectations"). P25/P75 of `completed_date - started_date`, in whole minutes,
   * over `COMPLETED` jobs of the same mix class in the last 90 days; `null` under 5 samples —
   * never invented from a smaller sample. Two classes only, never computed client-side.
   */
  async getExpectations(mix: string) {
    if (
      mix !== BilateralAiExpectationsMix.DOCUMENTS &&
      mix !== BilateralAiExpectationsMix.AUDIO
    ) {
      throw new BadRequestException('mix must be "documents" or "audio".');
    }

    const cached = this.expectationsCache.get(mix);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        response: cached.data,
        message: 'AI job expectations found',
        status: 200,
      };
    }

    // Timezone-skew fix: the 90-day sample window is evaluated by MySQL, not by the Node process.
    // `completed_date` is written in DB time (`bilateralAiDbNow`), so a JS
    // `MoreThan(new Date(Date.now() - window))` cutoff compared a process-zone instant against a
    // DB-zone column and shifted the whole window by the offset (5 h on a Bogota laptop against a
    // UTC database). `sampleWindowSeconds` is derived from a `static readonly` number and never
    // from request input, so it is interpolated as a SQL literal rather than bound — the generated
    // interval is what the regression test pins.
    const sampleWindowSeconds = Math.round(
      BilateralAiService.EXPECTATIONS_SAMPLE_WINDOW_MS / 1000,
    );
    const rows = await this.jobRepository
      .createQueryBuilder('job')
      .select([
        'job.job_id',
        'job.audio_keys',
        'job.started_date',
        'job.completed_date',
      ])
      .where('job.status = :status', {
        status: BilateralAiJobStatus.COMPLETED,
      })
      .andWhere(
        `job.completed_date > DATE_SUB(NOW(), INTERVAL ${sampleWindowSeconds} SECOND)`,
      )
      .getMany();

    const durationsSeconds = rows
      .filter((row) => this.mixClass(row) === mix)
      .map((row) => this.durationSeconds(row))
      .filter((seconds): seconds is number => seconds != null && seconds >= 0)
      .sort((a, b) => a - b);

    const sampleSize = durationsSeconds.length;
    const data: BilateralAiExpectationsResponseDto =
      sampleSize < BilateralAiService.EXPECTATIONS_MIN_SAMPLE_SIZE
        ? {
            mix: mix as BilateralAiExpectationsMix,
            sampleSize,
            p25Minutes: null,
            p75Minutes: null,
          }
        : {
            mix: mix as BilateralAiExpectationsMix,
            sampleSize,
            p25Minutes: this.percentileMinutes(durationsSeconds, 0.25),
            p75Minutes: this.percentileMinutes(durationsSeconds, 0.75),
          };

    this.expectationsCache.set(mix, {
      data,
      expiresAt: Date.now() + BilateralAiService.EXPECTATIONS_CACHE_MS,
    });

    return {
      response: data,
      message: 'AI job expectations found',
      status: 200,
    };
  }

  /** `documents` when the job carries no audio source, `audio` when it carries any (`design.md`
   * §5 "Expectations") — a document + audio job is `audio`, because audio is what makes it slow. */
  private mixClass(
    job: Pick<BilateralAiJob, 'audio_keys'>,
  ): BilateralAiExpectationsMix {
    return (job.audio_keys?.length ?? 0) > 0
      ? BilateralAiExpectationsMix.AUDIO
      : BilateralAiExpectationsMix.DOCUMENTS;
  }

  private durationSeconds(
    job: Pick<BilateralAiJob, 'started_date' | 'completed_date'>,
  ): number | null {
    if (!job.started_date || !job.completed_date) return null;
    return (
      (new Date(job.completed_date).getTime() -
        new Date(job.started_date).getTime()) /
      1000
    );
  }

  /** Nearest-rank percentile over an ascending-sorted seconds array, rounded to whole minutes. */
  private percentileMinutes(sortedSeconds: number[], p: number): number {
    const index = Math.min(
      sortedSeconds.length - 1,
      Math.max(0, Math.ceil(p * sortedSeconds.length) - 1),
    );
    return Math.round(sortedSeconds[index] / 60);
  }

  async getSignedUrl(key: string, user: TokenDto) {
    const jobId = this.extractJobIdFromKey(key);
    if (!jobId) throw new NotFoundException('Invalid file key.');
    const job = await this.jobRepository.findOne({
      where: { job_id: jobId, user_id: user.id },
    });
    if (!job) throw new NotFoundException('File not found.');
    const allKeys = [...(job.document_keys ?? []), ...(job.audio_keys ?? [])];
    if (!allKeys.includes(key)) throw new NotFoundException('File not found.');
    const url = this.storage.getSignedUrl(key);
    return { response: { url }, message: 'Signed URL generated', status: 200 };
  }

  private extractJobIdFromKey(key: string): string | null {
    const parts = key.split('/');
    return parts.length >= 3 ? parts[2] : null;
  }

  async getJobRaw(jobId: string): Promise<BilateralAiJob | null> {
    return this.jobRepository.findOne({ where: { job_id: jobId } });
  }

  /**
   * A draft is visible/actionable by any member of the Center it belongs to, not
   * just its creator — drafts are collaborative team artifacts before promotion.
   * `centerId` is a client-supplied filter on listDrafts, so this is the sole
   * authorization gate on that path; for the other methods it's derived from the
   * draft's own resolved job.center_id rather than trusted client input.
   *
   * `ASC-DD-7` (`docs/specs/changes/admin-sees-all-centers/design.md`): `mode` is required, not
   * defaulted, so every call site must state its own intent rather than inherit one silently.
   * `'read'` additionally admits a platform admin (`RoleByUserRepository.isUserAdmin`) who is not
   * a Center User of this centre; `'act'` never does — `promoteDraft`, `discardDraft` and
   * `setFormalEvidence` keep the membership-only check for every caller, admins included
   * (`ASC-R-15`). The admin lookup runs only after membership fails and only for `'read'`, so the
   * act path is byte-identical to before this pivot.
   */
  private async assertCenterEntitlement(
    userId: number,
    centerId: number,
    mode: 'read' | 'act',
  ): Promise<void> {
    const center = await this.clarisaCentersRepository.findOne({
      where: { institutionId: centerId },
    });
    if (!center) throw new NotFoundException('Center not found.');
    const isMember =
      await this.roleByUserRepository.validationCenterPermissions(
        userId,
        center.code,
      );
    if (isMember) return;
    if (mode === 'read') {
      const isAdmin = await this.roleByUserRepository.isUserAdmin(userId);
      if (isAdmin) return;
    }
    throw new ForbiddenException('You do not have access to this center.');
  }

  async listDrafts(userId: number, centerId: number) {
    await this.assertCenterEntitlement(userId, centerId, 'read');
    const drafts = await this.draftRepository.find({
      where: {
        is_discarded: false,
        job: { center_id: centerId },
      },
      relations: { job: true, result: true },
      order: { created_date: 'DESC' },
    });

    const userIds = [
      ...new Set(
        drafts
          .map((d) => d.job?.user_id)
          .filter((id): id is number => id != null),
      ),
    ];

    if (userIds.length > 0) {
      const users = await this.userRepository.find({
        where: { id: In(userIds) },
        select: { id: true, first_name: true, last_name: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      for (const draft of drafts) {
        if (draft.job?.user_id && userMap.has(draft.job.user_id)) {
          (draft.job as any).user = userMap.get(draft.job.user_id);
        }
      }
    }

    return drafts;
  }

  private async getDraftRaw(
    draftId: number,
    userId: number,
    mode: 'read' | 'act',
  ) {
    const draft = await this.draftRepository.findOne({
      where: { id: draftId, is_discarded: false },
      relations: { job: true, result: true },
    });
    if (!draft) throw new NotFoundException('AI draft not found.');
    await this.assertCenterEntitlement(userId, draft.job.center_id, mode);
    return draft;
  }

  async getDraft(draftId: number, userId: number) {
    const draft = await this.getDraftRaw(draftId, userId, 'read');
    const evidence = await this.evidenceRepository.find({
      where: { draft_id: draft.id, is_active: true },
      order: { created_date: 'ASC' },
    });
    return {
      response: { ...draft, evidence },
      message: 'AI draft found',
      status: 200,
    };
  }

  async setFormalEvidence(
    draftId: number,
    evidenceId: number,
    formal: boolean,
    userId: number,
  ) {
    const draft = await this.getDraftRaw(draftId, userId, 'act');
    const evidence = await this.evidenceRepository.findOne({
      where: { id: evidenceId, draft_id: draft.id, is_active: true },
    });
    if (!evidence) throw new NotFoundException('Draft evidence not found.');
    if (formal && evidence.source_type !== DraftEvidenceSourceType.DOCUMENT) {
      throw new BadRequestException(
        'Only document sources can become formal evidence.',
      );
    }
    evidence.is_formal_evidence = formal;
    const saved = await this.evidenceRepository.save(evidence);
    return { response: saved, message: 'Evidence updated', status: 200 };
  }

  async promoteDraft(draftId: number, userId: number) {
    const draft = await this.getDraftRaw(draftId, userId, 'act');
    const evidence = await this.evidenceRepository.find({
      where: { draft_id: draft.id, is_active: true },
      order: { created_date: 'ASC' },
    });
    const formalEvidence = evidence.filter((item) => item.is_formal_evidence);
    if (
      formalEvidence.some(
        (item) => item.source_type !== DraftEvidenceSourceType.DOCUMENT,
      )
    ) {
      throw new BadRequestException(
        'Only document sources can become formal evidence.',
      );
    }

    const result = await this.resultRepository.findOneOrFail({
      where: { id: draft.result_id },
    });

    // The lead centre is the centre the document was uploaded under — `job.center_id`, the same
    // value that scopes the drafts list and the entitlement check — never the centre the model
    // read in the text (see `populateResultFromExtractedMds`). Resolved to name + acronym as
    // well as id so the contributor de-duplication can recognise it under any spelling.
    const jobLeadCenter = await this.resolveJobLeadCenter(draft.job?.center_id);
    await this.bilateralService.populateResultFromExtractedMds(
      result,
      (draft.extracted_mds as Record<string, any>) ?? null,
      userId,
      { leadCenter: jobLeadCenter },
    );

    await this.bilateralService.populateInitiativeAndTocFromProgramCode(
      result.id,
      draft.job?.program_code,
      userId,
    );

    if (draft.extracted_mds) {
      await this.bilateralService.populateTypeSpecificFromExtractedMds(
        result,
        draft.extracted_mds as Record<string, any>,
        userId,
      );
    }

    await this.resultRepository.update(draft.result_id, {
      status_id: ResultStatusData.Editing.value,
    });

    // ▶ NEW (`ADE-T-4`, `@akili-spec docs/specs/bilateral/ai-draft-evidence-promotion`) —
    // attaches this draft's qualifying documents as formal evidence on the result just moved to
    // Editing (`design.md` §3.1). Scoped to THIS draft's own `id`/`result_id`, read above — never
    // a sibling draft's (`ADE-AC-1`). Runs after the point of no return so a transfer fault can
    // never strand the result in `Draft` (`ADE-R-5`). `transferForDraft` already isolates and
    // logs every document's own failure and never throws; the `try` here is defense in depth only,
    // so a defect in that contract still cannot cost the promotion its success response.
    try {
      await this.evidenceTransferService.transferForDraft(
        draft.id,
        draft.result_id,
        userId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `AI evidence transfer step failed unexpectedly for draft ${draft.id} (result ${draft.result_id}): ${message}`,
      );
    }

    await this.draftRepository.update(draft.id, { is_discarded: true });

    return {
      // resultCode + versionId let the client land on the canonical editor URL
      // (/bilateral/:center/result/:result_code?phase=:versionId) — the same shape the results
      // list opens, where `:id` is a result_code resolved together with the phase. Navigating with
      // the bare internal id worked only through the no-phase fallback and produced a URL that
      // cannot be shared across phases.
      response: {
        resultId: draft.result_id,
        resultCode: result.result_code,
        versionId: result.version_id,
      },
      message: 'Draft promoted to bilateral result',
      status: 200,
    };
  }

  /** The job's centre as a `handleLeadCenter` input, or undefined when the job carries none. */
  private async resolveJobLeadCenter(
    centerInstitutionId: number | null | undefined,
  ): Promise<
    { name?: string; acronym?: string; institution_id?: number } | undefined
  > {
    if (centerInstitutionId == null) return undefined;
    const institution = await this.clarisaInstitutionsRepository.findOne({
      where: { id: centerInstitutionId },
    });
    if (!institution) {
      this.logger.warn(
        `Job centre institution ${centerInstitutionId} not found; the promoted result gets no lead centre from the job`,
      );
      return { institution_id: centerInstitutionId };
    }
    return {
      institution_id: institution.id,
      acronym: institution.acronym ?? undefined,
      name: institution.name ?? undefined,
    };
  }

  async discardDraft(draftId: number, userId: number) {
    const draft = await this.getDraftRaw(draftId, userId, 'act');
    await this.draftRepository.update(draft.id, { is_discarded: true });
    await this.resultRepository.update(draft.result_id, { is_active: false });
    return {
      response: { id: draft.id, discarded: true },
      message: 'AI draft discarded',
      status: 200,
    };
  }

  /**
   * Attempt-start conditional update (`design.md` §5 "Attempt start", `APF-DD-3`). A job's
   * `status` is never both `PENDING` and `PROCESSING` at once, so trying the condition that
   * matches the already-read row (`PENDING`, or `PROCESSING & retrying`) and reading `affected`
   * is equivalent to the single `WHERE status IN (PENDING, PROCESSING & retrying)` statement in
   * the design doc, while keeping the criteria a plain `Repository#update` `where` object the
   * spec can assert directly. `error_code`/`error_message` are intentionally **absent** from the
   * `SET` — they are the "last error" the retry panel reads (`APF-R-3`) and must survive this
   * write. `retrying` is set to `false` unconditionally so nothing else has to remember to clear
   * it. Any other `status` (already `COMPLETED`/`FAILED` — the sweeper or another consumer won)
   * skips the write entirely and reports "not started".
   *
   * @akili-spec bilateral/ai-processing-feedback
   *
   * `AIQ-T-2`: no longer `private` — `BilateralAiDispatchService.decide` calls this directly, as
   * the claim, while holding the named lock (`design.md` §5.2, `AIQ-DD-1`). The WHERE clauses
   * below are unchanged from the original private method (P-2 disqualifier).
   *
   * Attempt 2 (Reviewer A, concurrency lens): `manager` is optional, `selectManager` pattern
   * (`src/CLAUDE.md` §11.2) — the dispatch service passes its lock-holding `queryRunner.manager`
   * so the claim runs on the SAME connection as `GET_LOCK`/`RELEASE_LOCK` (`design.md` §5.2:
   * "acquire, decide, claim and release must share that connection"), instead of borrowing a
   * second pool connection while the lock is held. Omitted, this defaults to the service's own
   * pooled `jobRepository` — today's unchanged path for every other caller.
   */
  async attemptStart(
    job: BilateralAiJob,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = selectManager(manager, BilateralAiJob, this.jobRepository);
    // `stage_updated_date` and `started_date` share `bilateralAiDbNow` — one `CURRENT_TIMESTAMP`
    // evaluation per UPDATE statement keeps them identical, as a shared JS `now` did before.
    const set = {
      status: BilateralAiJobStatus.PROCESSING,
      stage: BilateralAiJobStage.UPLOADING,
      stage_updated_date: bilateralAiDbNow,
      attempts: job.attempts + 1,
      retrying: false,
      started_date: bilateralAiDbNow,
    };
    let result: { affected?: number } | undefined;
    if (job.status === BilateralAiJobStatus.PENDING) {
      result = await repo.update(
        { job_id: job.job_id, status: BilateralAiJobStatus.PENDING },
        set,
      );
    } else if (job.status === BilateralAiJobStatus.PROCESSING && job.retrying) {
      result = await repo.update(
        {
          job_id: job.job_id,
          status: BilateralAiJobStatus.PROCESSING,
          retrying: true,
        },
        set,
      );
    } else {
      return false;
    }
    return (result?.affected ?? 0) > 0;
  }

  /**
   * `reading` when only documents are present, `transcribing` when only audio, `reading_transcribing`
   * when both — the three are pre-set from the source mix because the mining call is one opaque
   * request (`APF-R-1` B, `design.md` §5 "Stage advancement"). `null` when the job carries neither
   * (text-context-only jobs skip straight from `uploading` to `extracting`).
   */
  private intermediateStage(
    job: Pick<BilateralAiJob, 'document_keys' | 'audio_keys'>,
  ): string | null {
    const hasDocs = (job.document_keys?.length ?? 0) > 0;
    const hasAudio = (job.audio_keys?.length ?? 0) > 0;
    if (hasDocs && hasAudio) return BilateralAiJobStage.READING_TRANSCRIBING;
    if (hasDocs) return BilateralAiJobStage.READING;
    if (hasAudio) return BilateralAiJobStage.TRANSCRIBING;
    return null;
  }

  /**
   * Stage-advancement conditional update (`design.md` §5 "Conditional transitions"): every write
   * is scoped to `status = PROCESSING`, the status `attemptStart` just set. A 0-row result means
   * another actor (the sweeper) already moved the job off `PROCESSING` — logged at `debug`, never
   * thrown, since the in-flight mining call cannot be cancelled either way.
   */
  private async setStage(jobId: string, stage: string): Promise<void> {
    const result = await this.jobRepository.update(
      { job_id: jobId, status: BilateralAiJobStatus.PROCESSING },
      { stage, stage_updated_date: bilateralAiDbNow },
    );
    if (!result?.affected) {
      this.logger.debug(
        `Bilateral AI job ${jobId} stage update to "${stage}" affected 0 rows — status changed concurrently.`,
      );
      return;
    }
    // `design.md` §9 Observability: "info on stage transitions (jobId, stage)".
    this.logger.log(`Bilateral AI job ${jobId} stage -> ${stage}.`);
  }

  /**
   * `options.skipClaim` (`AIQ-T-2`): set by `BilateralAiConsumer` when
   * `BilateralAiDispatchService.decide` already claimed this job (the `run` outcome) under the
   * named lock. `attemptStart`'s own conditional update would find the row already `PROCESSING`
   * and not `retrying`, return 0 rows affected, and wrongly abort — so this path trusts the
   * dispatch service's claim instead of re-running it. The `resume-retry` outcome (and any other
   * caller) omits the option and gets today's unchanged path: this method performs the claim
   * itself, exactly as before `AIQ-T-2`.
   */
  async processJob(
    jobId: string,
    options?: { skipClaim?: boolean },
  ): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { job_id: jobId } });
    if (!job || job.status === BilateralAiJobStatus.COMPLETED) return;

    let started: boolean;
    let attemptNumber: number;
    if (options?.skipClaim) {
      started = job.status === BilateralAiJobStatus.PROCESSING;
      // The dispatch service's `attemptStart` call already incremented `attempts`.
      attemptNumber = job.attempts;
    } else {
      started = await this.attemptStart(job);
      attemptNumber = job.attempts + 1;
    }
    if (!started) {
      // The sweeper or another consumer already owns/terminated this job — calling mining for a
      // terminated job would burn a 10-minute request and could resurrect a FAILED row
      // (`design.md` §5 "Attempt start").
      this.logger.debug(
        `Bilateral AI job ${jobId} attempt-start affected 0 rows; already claimed or already terminal.`,
      );
      return;
    }

    try {
      const user = await this.userRepository.findOne({
        where: { id: job.user_id },
        select: { email: true, first_name: true },
      });
      if (!user?.email) {
        throw new Error(
          'The user email could not be resolved for AI processing.',
        );
      }

      const stage = this.intermediateStage(job);
      if (stage) await this.setStage(jobId, stage);
      await this.setStage(jobId, BilateralAiJobStage.EXTRACTING);

      this.logger.log(
        `Sending job ${jobId} to bilateral AI text mining (bucket: ${job.bucket_name}, documents: ${job.document_keys?.length ?? 0}, audio: ${job.audio_keys?.length ?? 0}).`,
      );
      const response = await this.textMining.extract({
        bucketName: job.bucket_name,
        keys: job.document_keys ?? [],
        audio_keys: job.audio_keys ?? [],
        ...(job.text_context ? { text: job.text_context } : {}),
        user_id: user.email,
        project_id: job.project_id,
        program_code: job.program_code,
      });

      await this.setStage(jobId, BilateralAiJobStage.VALIDATING);
      const normalized = this.textMining.normalize(response);

      await this.setStage(jobId, BilateralAiJobStage.CREATING_DRAFTS);
      let resultCount = 0;
      for (let index = 0; index < normalized.results.length; index += 1) {
        const candidate = normalized.results[index];
        const draft = await this.createDraftFromCandidate(
          job,
          candidate,
          index,
        );
        if (draft) resultCount += 1;
      }

      // Late-completion detection, read BEFORE the write below (`design.md` §5 "Late
      // completion", `APF-R-2` A): a mining response that lands after the sweeper already gave
      // up on this job (`FAILED`/`TIMED_OUT`) still creates drafts and completes the job, but the
      // notification says "arrived after all" instead of the on-time copy.
      const priorState = await this.jobRepository.findOne({
        where: { job_id: jobId },
        select: { status: true, error_code: true },
      });
      const late =
        priorState?.status === BilateralAiJobStatus.FAILED &&
        priorState?.error_code === 'TIMED_OUT';

      // Unconditional on `job_id` alone (not scoped to `status = PROCESSING`): a late mining
      // response must still be able to flip a `FAILED`/`TIMED_OUT` row to `COMPLETED`
      // (`APF-R-2` A, `design.md` §5 "Late completion") — the draft-level idempotency lives in
      // `createDraftFromCandidate`, not in this write's WHERE clause. `completed_date` is written
      // in DB time (`bilateralAiDbNow`); `notifyTerminal` re-reads it from the row itself to
      // compute the queue duration, rather than being passed the JS instant this write no longer
      // computes (timezone-skew fix).
      await this.jobRepository.update(
        { job_id: jobId },
        {
          status: BilateralAiJobStatus.COMPLETED,
          result_count: resultCount,
          external_interaction_id: normalized.interactionId,
          response_snapshot: response,
          completed_date: bilateralAiDbNow,
        },
      );

      // `AIQ-T-3` (`design.md` §5.3 P-5): this write just freed a lane — wake the next eligible
      // parked job under the lock instead of waiting for the sweeper's next tick.
      await this.wakeDispatch('completed');

      // Processing can take minutes and the uploader has usually moved on; the client no longer
      // force-redirects on completion (2026-09-04), so this is what tells them the outcome. After
      // the status update and never blocking: a notification failure must not fail the job
      // (`notifyTerminal` never throws — `APF-R-4`).
      await this.notificationsService.notifyTerminal(
        job,
        resultCount > 0 ? 'results_ready' : 'no_candidates',
        { resultCount, late },
      );
    } catch (error: any) {
      const status = error?.status;
      const retryable = !status || status >= 500;
      const failure =
        error instanceof Error ? error.message : 'AI processing failed.';
      const errorCode = status ? `HTTP_${status}` : 'PROCESSING_ERROR';

      if (retryable && attemptNumber < getBilateralAiMaxAttempts()) {
        // Retry semantics (`APF-R-3`, `APF-DD-3`): stay PROCESSING, never bounce through FAILED.
        await this.jobRepository.update(
          { job_id: jobId, status: BilateralAiJobStatus.PROCESSING },
          {
            retrying: true,
            stage: BilateralAiJobStage.QUEUED,
            stage_updated_date: bilateralAiDbNow,
            error_code: errorCode,
            error_message: failure,
          },
        );
        throw error;
      }

      const result = await this.jobRepository.update(
        { job_id: jobId, status: BilateralAiJobStatus.PROCESSING },
        {
          status: BilateralAiJobStatus.FAILED,
          error_code: errorCode,
          error_message: failure,
          completed_date: bilateralAiDbNow,
        },
      );
      if (result?.affected) {
        // `design.md` §9 Observability: "error on final FAILED" — jobId + error_code only, per
        // AC-9 (no message text, which could echo back sensitive upstream detail).
        this.logger.error(
          `Bilateral AI job ${jobId} failed terminally (error_code=${errorCode}).`,
        );
        await this.notificationsService.notifyTerminal(
          { ...job, error_code: errorCode },
          'failed',
        );
        // `AIQ-T-3` (`design.md` §5.3 P-5): the final FAILED write just freed a lane too — same
        // guard as the COMPLETED path, scoped to an actual affected write so a lost race (another
        // actor already moved the row) never wakes on someone else's behalf.
        await this.wakeDispatch('failed');
      }
      if (retryable) throw error;
    }
  }

  /**
   * `AIQ-T-3` (`design.md` §5.3, `AIQ-DD-2`): wakes the dispatch service after a `processJob`
   * write that just freed a lane (`COMPLETED` or the final `FAILED`). `BilateralAiDispatchService
   * .wake` documents itself as never-throwing (it catches and logs internally around its own
   * `GET_LOCK`/publish work), but this call site adds its own try/catch as defense in depth —
   * mirroring `promoteDraft`'s evidence-transfer step — so a fault at wake time (e.g. the DB being
   * down when `wake` tries to `connect()`) can never rethrow from here and turn a job that just
   * terminated successfully into a consumer retry. The sweeper's next tick recovers regardless.
   */
  private async wakeDispatch(reason: string): Promise<void> {
    try {
      await this.dispatchService.wake(reason);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Bilateral AI dispatch wake(${reason}) failed after processJob: ${message}`,
      );
    }
  }

  private async createDraftFromCandidate(
    job: BilateralAiJob,
    candidate: Record<string, unknown>,
    candidateIndex: number,
  ): Promise<BilateralAiDraft | null> {
    // Late-completion idempotency, before any write (`APF-R-2` A, `design.md` §5 "Late
    // completion"): a re-run for this (job_id, candidate_index) — the mining response arriving
    // after the sweeper already flipped the row, or a redelivered RMQ message — reuses the
    // existing draft/result instead of creating a second `Result` row.
    const existing = await this.draftRepository.findOne({
      where: { job_id: job.job_id, candidate_index: candidateIndex },
    });
    if (existing) return existing;

    const indicator = String(candidate.indicator || '');
    const mapping = TYPE_BY_INDICATOR[indicator];
    // Knowledge Product candidates are intentionally not drafted (out of scope):
    // the text-mining / model pipeline does not identify Knowledge Products, so
    // this branch is defensive and effectively unreachable today. If KP extraction
    // is ever enabled, handle them here instead of silently skipping (P2-3103).
    if (!mapping || mapping.type === 6) return null;
    const phase = await this.versioningService.$_findActivePhase(1);
    const year = await this.yearRepository.findOne({ where: { active: true } });
    if (!phase || !year)
      throw new Error('No active reporting phase or year found.');
    const result = await this.resultRepository.save({
      created_by: job.user_id,
      version_id: phase.id,
      title: String(
        candidate.title || `Bilateral AI Draft ${candidateIndex + 1}`,
      ),
      description: String(candidate.description || ''),
      reported_year_id: year.year,
      result_code: 0,
      result_type_id: mapping.type,
      result_level_id: mapping.level,
      source: SourceEnum.Bilateral,
      creation_method: ResultCreationMethod.AI,
      status_id: ResultStatusData.Draft.value,
    } as Result);
    await this.resultsByProjectsRepository.save({
      result_id: result.id,
      project_id: job.project_id,
      created_by: job.user_id,
      is_lead: true,
    });
    const draft = await this.draftRepository.save(
      this.draftRepository.create({
        job_id: job.job_id,
        result_id: result.id,
        candidate_index: candidateIndex,
        extracted_mds: candidate,
        candidate_snapshot: candidate,
        mapping_warnings: null,
        is_discarded: false,
      }),
    );
    for (const key of job.document_keys ?? []) {
      const fileName = key.split('/').pop() ?? key;
      await this.evidenceRepository.save({
        draft_id: draft.id,
        source_type: DraftEvidenceSourceType.DOCUMENT,
        object_key: key,
        file_name: fileName,
        mime_type: null,
        file_size: null,
        // ADE-R-6 / DD-5: descriptive in v1, not load-bearing — `ADE-T-1`'s predicate decides
        // what `promoteDraft`'s transfer selects, this flag only records intent.
        is_formal_evidence: isQualifyingEvidenceDocument({
          source_type: DraftEvidenceSourceType.DOCUMENT,
          file_name: fileName,
        }),
        file_management_reference: null,
        is_active: true,
      });
    }
    for (const key of job.audio_keys ?? []) {
      await this.evidenceRepository.save({
        draft_id: draft.id,
        source_type: DraftEvidenceSourceType.VOICE_NOTE,
        object_key: key,
        file_name: key.split('/').pop() ?? key,
        mime_type: null,
        file_size: null,
        is_formal_evidence: false,
        file_management_reference: null,
        is_active: true,
      });
    }
    if (job.text_context) {
      await this.evidenceRepository.save({
        draft_id: draft.id,
        source_type: DraftEvidenceSourceType.TEXT_CONTEXT,
        object_key: null,
        file_name: null,
        mime_type: 'text/plain',
        file_size: Buffer.byteLength(job.text_context),
        is_formal_evidence: false,
        file_management_reference: null,
        is_active: true,
      });
    }
    return draft;
  }
}
