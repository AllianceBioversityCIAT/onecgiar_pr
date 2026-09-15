import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, LessThan, MoreThan, Repository } from 'typeorm';
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
import { getBilateralAiMaxAttempts } from '../bilateral-ai.config';
import { BilateralAiNotificationsService } from './bilateral-ai-notifications.service';
import {
  BilateralAiExpectationsMix,
  BilateralAiExpectationsResponseDto,
} from '../dto/bilateral-ai-expectations.dto';

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
    private readonly notificationsService: BilateralAiNotificationsService,
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
        completed_date: new Date(),
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
   * `APF-R-1` A: `queue_position` is computed at read time from `bilateral_ai_jobs` — never
   * stored — and is meaningful only while this job itself is `PENDING` (`design.md` §4.1). It
   * counts non-terminal jobs (`PENDING`/`PROCESSING`) whose queue-entry clock is older than this
   * job's own `queue_entry_date = COALESCE(retried_date, created_date)`, so a retried job takes
   * its place at the back of the queue instead of ranking by `created_date`.
   */
  async getJob(jobId: string, userId: number) {
    const job = await this.jobRepository.findOne({
      where: { job_id: jobId, user_id: userId },
    });
    if (!job) throw new NotFoundException('AI job not found.');

    let queue_position: number | null = null;
    if (job.status === BilateralAiJobStatus.PENDING) {
      queue_position = await this.jobRepository.count({
        where: {
          status: In([
            BilateralAiJobStatus.PENDING,
            BilateralAiJobStatus.PROCESSING,
          ]),
          queue_entry_date: LessThan(job.queue_entry_date),
        },
      });
    }

    return {
      response: {
        ...job,
        queue_position,
        max_attempts: getBilateralAiMaxAttempts(),
      },
      message: 'AI job found',
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

    const now = new Date();
    const reset = await this.jobRepository.update(
      { job_id: jobId, status: BilateralAiJobStatus.FAILED },
      {
        status: BilateralAiJobStatus.PENDING,
        stage: BilateralAiJobStage.QUEUED,
        stage_updated_date: now,
        attempts: 0,
        retrying: false,
        error_code: null,
        error_message: null,
        started_date: null,
        completed_date: null,
        retried_date: now,
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
        completed_date: new Date(),
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

    const since = new Date(
      Date.now() - BilateralAiService.EXPECTATIONS_SAMPLE_WINDOW_MS,
    );
    const rows = await this.jobRepository.find({
      where: {
        status: BilateralAiJobStatus.COMPLETED,
        completed_date: MoreThan(since),
      },
      select: { audio_keys: true, started_date: true, completed_date: true },
    });

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
   */
  private async assertCenterEntitlement(
    userId: number,
    centerId: number,
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
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this center.');
    }
  }

  async listDrafts(userId: number, centerId: number) {
    await this.assertCenterEntitlement(userId, centerId);
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

  private async getDraftRaw(draftId: number, userId: number) {
    const draft = await this.draftRepository.findOne({
      where: { id: draftId, is_discarded: false },
      relations: { job: true, result: true },
    });
    if (!draft) throw new NotFoundException('AI draft not found.');
    await this.assertCenterEntitlement(userId, draft.job.center_id);
    return draft;
  }

  async getDraft(draftId: number, userId: number) {
    const draft = await this.getDraftRaw(draftId, userId);
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
    const draft = await this.getDraftRaw(draftId, userId);
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
    const draft = await this.getDraftRaw(draftId, userId);
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
    const draft = await this.getDraftRaw(draftId, userId);
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
   */
  private async attemptStart(job: BilateralAiJob): Promise<boolean> {
    const now = new Date();
    const set = {
      status: BilateralAiJobStatus.PROCESSING,
      stage: BilateralAiJobStage.UPLOADING,
      stage_updated_date: now,
      attempts: job.attempts + 1,
      retrying: false,
      started_date: now,
    };
    let result: { affected?: number } | undefined;
    if (job.status === BilateralAiJobStatus.PENDING) {
      result = await this.jobRepository.update(
        { job_id: job.job_id, status: BilateralAiJobStatus.PENDING },
        set,
      );
    } else if (job.status === BilateralAiJobStatus.PROCESSING && job.retrying) {
      result = await this.jobRepository.update(
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
      { stage, stage_updated_date: new Date() },
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

  async processJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { job_id: jobId } });
    if (!job || job.status === BilateralAiJobStatus.COMPLETED) return;

    const started = await this.attemptStart(job);
    if (!started) {
      // The sweeper or another consumer already owns/terminated this job — calling mining for a
      // terminated job would burn a 10-minute request and could resurrect a FAILED row
      // (`design.md` §5 "Attempt start").
      this.logger.debug(
        `Bilateral AI job ${jobId} attempt-start affected 0 rows; already claimed or already terminal.`,
      );
      return;
    }
    const attemptNumber = job.attempts + 1;

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
      // `createDraftFromCandidate`, not in this write's WHERE clause.
      const completedAt = new Date();
      await this.jobRepository.update(
        { job_id: jobId },
        {
          status: BilateralAiJobStatus.COMPLETED,
          result_count: resultCount,
          external_interaction_id: normalized.interactionId,
          response_snapshot: response,
          completed_date: completedAt,
        },
      );

      // Processing can take minutes and the uploader has usually moved on; the client no longer
      // force-redirects on completion (2026-09-04), so this is what tells them the outcome. After
      // the status update and never blocking: a notification failure must not fail the job
      // (`notifyTerminal` never throws — `APF-R-4`).
      await this.notificationsService.notifyTerminal(
        job,
        resultCount > 0 ? 'results_ready' : 'no_candidates',
        { resultCount, late, terminalDate: completedAt },
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
            stage_updated_date: new Date(),
            error_code: errorCode,
            error_message: failure,
          },
        );
        throw error;
      }

      const completedAt = new Date();
      const result = await this.jobRepository.update(
        { job_id: jobId, status: BilateralAiJobStatus.PROCESSING },
        {
          status: BilateralAiJobStatus.FAILED,
          error_code: errorCode,
          error_message: failure,
          completed_date: completedAt,
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
          { terminalDate: completedAt },
        );
      }
      if (retryable) throw error;
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
      await this.evidenceRepository.save({
        draft_id: draft.id,
        source_type: DraftEvidenceSourceType.DOCUMENT,
        object_key: key,
        file_name: key.split('/').pop() ?? key,
        mime_type: null,
        file_size: null,
        is_formal_evidence: false,
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
