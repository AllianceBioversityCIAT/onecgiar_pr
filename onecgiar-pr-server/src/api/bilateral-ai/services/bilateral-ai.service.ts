import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
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

const TYPE_BY_INDICATOR: Record<string, { type: number; level: number }> = {
  'Policy Change': { type: 1, level: 3 },
  'Innovation Use': { type: 2, level: 3 },
  'Other Outcome': { type: 4, level: 3 },
  'Capacity Sharing for Development': { type: 5, level: 4 },
  'Knowledge Product': { type: 6, level: 4 },
  'Innovation Development': { type: 7, level: 4 },
  'Other Output': { type: 8, level: 4 },
};

@Injectable()
export class BilateralAiService {
  private readonly logger = new Logger(BilateralAiService.name);

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

  async getJob(jobId: string, userId: number) {
    const job = await this.jobRepository.findOne({
      where: { job_id: jobId, user_id: userId },
    });
    if (!job) throw new NotFoundException('AI job not found.');
    return { response: job, message: 'AI job found', status: 200 };
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
    const isMember = await this.roleByUserRepository.validationCenterPermissions(
      userId,
      center.code,
    );
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this center.');
    }
  }

  async listDrafts(userId: number, centerId: number) {
    await this.assertCenterEntitlement(userId, centerId);
    return this.draftRepository.find({
      where: {
        is_discarded: false,
        job: { center_id: centerId },
      },
      relations: { job: true, result: true },
      order: { created_date: 'DESC' },
    });
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

    if (draft.extracted_mds) {
      await this.bilateralService.populateResultFromExtractedMds(
        result,
        draft.extracted_mds as Record<string, any>,
        userId,
      );
    }

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
      response: { resultId: draft.result_id },
      message: 'Draft promoted to bilateral result',
      status: 200,
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

  async processJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { job_id: jobId } });
    if (!job || job.status === BilateralAiJobStatus.COMPLETED) return;
    await this.jobRepository.update(jobId, {
      status: BilateralAiJobStatus.PROCESSING,
      attempts: job.attempts + 1,
      started_date: new Date(),
      error_code: null,
      error_message: null,
    });
    try {
      const user = await this.userRepository.findOne({
        where: { id: job.user_id },
        select: { email: true },
      });
      if (!user?.email) {
        throw new Error(
          'The user email could not be resolved for AI processing.',
        );
      }

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
      const normalized = this.textMining.normalize(response);
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
      await this.jobRepository.update(jobId, {
        status: BilateralAiJobStatus.COMPLETED,
        result_count: resultCount,
        external_interaction_id: normalized.interactionId,
        response_snapshot: response,
        completed_date: new Date(),
      });
    } catch (error: any) {
      const status = error?.status;
      const retryable = !status || status >= 500;
      const failure =
        error instanceof Error ? error.message : 'AI processing failed.';
      await this.jobRepository.update(jobId, {
        status: BilateralAiJobStatus.FAILED,
        error_code: status ? `HTTP_${status}` : 'PROCESSING_ERROR',
        error_message: failure,
        completed_date: new Date(),
      });
      if (retryable) throw error;
    }
  }

  private async createDraftFromCandidate(
    job: BilateralAiJob,
    candidate: Record<string, unknown>,
    candidateIndex: number,
  ): Promise<BilateralAiDraft | null> {
    const indicator = String(candidate.indicator || '');
    const mapping = TYPE_BY_INDICATOR[indicator];
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
