import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BilateralService } from './bilateral.service';
import { BilateralController } from './bilateral.controller';
import { ResultsModule } from '../results/results.module';
import { VersioningModule } from '../versioning/versioning.module';
import { UserModule } from '../../auth/modules/user/user.module';
import { ClarisaRegionsModule } from '../../clarisa/clarisa-regions/clarisa-regions.module';
import { YearsModule } from '../results/years/years.module';
import { SubmissionsModule } from '../results/submissions/submissions.module';
import { ClarisaGeographicScopesModule } from '../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.module';
import { ResultRegionsModule } from '../results/result-regions/result-regions.module';
import { ClarisaCountriesModule } from '../../clarisa/clarisa-countries/clarisa-countries.module';
import { ResultCountriesModule } from '../results/result-countries/result-countries.module';
import { ClarisaSubnationalScopeModule } from '../../clarisa/clarisa-subnational-scope/clarisa-subnational-scope.module';
import { ResultCountriesSubNationalModule } from '../results/result-countries-sub-national/result-countries-sub-national.module';
import { ResultsByInstitutionsModule } from '../results/results_by_institutions/results_by_institutions.module';
import { ClarisaInstitutionsModule } from '../../clarisa/clarisa-institutions/clarisa-institutions.module';
import { EvidencesModule } from '../results/evidences/evidences.module';
import { ResultsKnowledgeProductsModule } from '../results/results-knowledge-products/results-knowledge-products.module';
import { ClarisaCentersModule } from '../../clarisa/clarisa-centers/clarisa-centers.module';
import { NonPooledProjectsModule } from '../results/non-pooled-projects/non-pooled-projects.module';
import { ResultTypesModule } from '../results/result_types/result_types.module';
import { ResultsTocResultsModule } from '../results/results-toc-results/results-toc-results.module';
import { ResultsCentersModule } from '../results/results-centers/results-centers.module';
import { ClarisaProjectsModule } from '../../clarisa/clarisa-projects/clarisa-projects.module';
import { ResultsByProjectsModule } from '../results/results_by_projects/results_by_projects.module';
import { CapdevsTermsModule } from '../results/capdevs-terms/capdevs-terms.module';
import { CapdevsDeliveryMethodsModule } from '../results/capdevs-delivery-methods/capdevs-delivery-methods.module';
import { ClarisaInnovationReadinessLevelsModule } from '../../clarisa/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.module';
import { ClarisaInnovationUseLevelsModule } from '../../clarisa/clarisa-innovation-use-levels/clarisa-innovation-use-levels.module';
import { ClarisaPolicyTypesModule } from '../../clarisa/clarisa-policy-types/clarisa-policy-types.module';
import { ClarisaPolicyStagesModule } from '../../clarisa/clarisa-policy-stages/clarisa-policy-stages.module';
import { InnovationUseModule } from '../results-framework-reporting/innovation-use/innovation-use.module';
import { ResultsByInititiativesModule } from '../results/results_by_inititiatives/results_by_inititiatives.module';
import { ShareResultRequestModule } from '../results/share-result-request/share-result-request.module';
import { KnowledgeProductBilateralHandler } from './handlers/knowledge-product.handler';
import { CapacityChangeBilateralHandler } from './handlers/capacity-change.handler';
import { InnovationDevelopmentBilateralHandler } from './handlers/innovation-development.handler';
import { InnovationUseBilateralHandler } from './handlers/innovation-use.handler';
import { PolicyChangeBilateralHandler } from './handlers/policy-change.handler';
import { ResultsInnovationsDevRepository } from '../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../results/summary/repositories/results-innovations-use.repository';
import { ResultsCapacityDevelopmentsRepository } from '../results/summary/repositories/results-capacity-developments.repository';
import { ResultsPolicyChangesRepository } from '../results/summary/repositories/results-policy-changes.repository';
import { NoopBilateralHandler } from './handlers/noop.handler';
import { NonPooledProjectBudgetRepository } from '../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ActorTypeRepository } from '../results/result-actors/repositories/actors-type.repository';
import { BilateralVersioningService } from './services/bilateral-versioning.service';
import { BilateralVersioningRulesModule } from './versioning-rules/bilateral-versioning-rules.module';
import { PathwayModule } from '../ipsr-framework/pathway/pathway.module';
import { ClarisaApiKeyValidationService } from './services/clarisa-api-key-validation.service';
import { ClarisaApiKeyGuard } from './guards/clarisa-api-key.guard';
import { BilateralCenterController } from './bilateral-center.controller';
import { BilateralHandoffController } from './bilateral-handoff.controller';
import { BilateralProjectsService } from './services/bilateral-projects.service';
import { BilateralCenterService } from './services/bilateral-center.service';
import { ClarisaProject } from '../../clarisa/clarisa-projects/entity/clarisa-projects.entity';
import { ClarisaCenter } from '../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { BilateralHandoffCode } from './entities/bilateral-handoff-code.entity';
import { BilateralQualityAssessment } from './entities/bilateral-quality-assessment.entity';
import { BilateralQualityAssessmentRepository } from './repositories/bilateral-quality-assessment.repository';
import { BilateralQualityPayloadBuilder } from './services/quality-assessment/bilateral-quality-payload.builder';
import { BilateralQualityAssessmentClient } from './services/quality-assessment/bilateral-quality-assessment.client';
import { BilateralQualityAssessmentService } from './services/quality-assessment/bilateral-quality-assessment.service';
import { INDICATOR_DESCRIPTION_RESOLVER } from './services/quality-assessment/indicator-description-resolver';
import { TocIndicatorDescriptionResolver } from './services/quality-assessment/toc-indicator-description-resolver.service';
import { ClarisaInitiative } from '../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultByLevelModule } from '../results/result-by-level/result-by-level.module';
import { Result } from '../results/entities/result.entity';
import { BilateralAiJob } from '../bilateral-ai/entities/bilateral-ai-job.entity';
import { BilateralAiDraft } from '../bilateral-ai/entities/bilateral-ai-draft.entity';
import { DraftEvidence } from '../bilateral-ai/entities/draft-evidence.entity';
import { BilateralAiController } from '../bilateral-ai/bilateral-ai.controller';
import { BilateralAiConsumer } from '../bilateral-ai/bilateral-ai.consumer';
import { BilateralAiService } from '../bilateral-ai/services/bilateral-ai.service';
import { BilateralAiFileStorageService } from '../bilateral-ai/services/bilateral-ai-file-storage.service';
import { BilateralAiTextMiningService } from '../bilateral-ai/services/bilateral-ai-text-mining.service';
import { BilateralAiNotificationsService } from '../bilateral-ai/services/bilateral-ai-notifications.service';
import { BilateralAiEvidenceTransferService } from '../bilateral-ai/services/bilateral-ai-evidence-transfer.service';
import { SharePointModule } from '../../shared/services/share-point/share-point.module';
import { BilateralAiSweeperCron } from '../bilateral-ai/bilateral-ai-sweeper.cron';
import { BilateralAiProcessingQueueModule } from '../../shared/microservices/bilateral-ai-processing-queue/bilateral-ai-processing-queue.module';
import { RoleByUserModule } from '../../auth/modules/role-by-user/role-by-user.module';
import { AdUsersModule } from '../ad_users/ad_users.module';
import { WebhookOutboxModule } from '../results/webhook/webhook-outbox.module';
import { EmailNotificationManagementModule } from '../../shared/microservices/email-notification-management/email-notification-management.module';
import { TemplateRepository } from '../platform-report/repositories/template.repository';
import { NotificationModule } from '../notification/notification.module';
import { BilateralWebhookController } from './bilateral-webhook.controller';
import { BilateralWebhookService } from './services/bilateral-webhook.service';
import { SummaryModule } from '../results/summary/summary.module';
import { InnovationUseMdsValidator } from './services/innovation-use-mds-validator.service';
import { BilateralHandoffService } from './services/bilateral-handoff.service';
import { HandlersError } from '../../shared/handlers/error.utils';
import { AoWBilateralRepository } from '../results/results-toc-results/repositories/aow-bilateral.repository';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      ClarisaProject,
      ClarisaCenter,
      ClarisaInitiative,
      Result,
      BilateralAiJob,
      BilateralAiDraft,
      DraftEvidence,
      BilateralHandoffCode,
      BilateralQualityAssessment,
    ]),
    ResultsModule,
    VersioningModule,
    BilateralVersioningRulesModule,
    UserModule,
    ClarisaRegionsModule,
    YearsModule,
    SubmissionsModule,
    ClarisaGeographicScopesModule,
    ResultRegionsModule,
    ClarisaCountriesModule,
    ResultCountriesModule,
    ClarisaSubnationalScopeModule,
    ResultCountriesSubNationalModule,
    ResultsByInstitutionsModule,
    ClarisaInstitutionsModule,
    EvidencesModule,
    ResultsKnowledgeProductsModule,
    ClarisaCentersModule,
    NonPooledProjectsModule,
    ResultTypesModule,
    ResultsTocResultsModule,
    ResultsCentersModule,
    ClarisaProjectsModule,
    ResultsByProjectsModule,
    CapdevsTermsModule,
    CapdevsDeliveryMethodsModule,
    ClarisaInnovationReadinessLevelsModule,
    ClarisaInnovationUseLevelsModule,
    ClarisaPolicyTypesModule,
    ClarisaPolicyStagesModule,
    InnovationUseModule,
    SummaryModule,
    ResultsByInititiativesModule,
    ShareResultRequestModule,
    PathwayModule,
    ResultByLevelModule,
    BilateralAiProcessingQueueModule,
    RoleByUserModule,
    AdUsersModule,
    // P2-3166: the endpoint repository, for registering a platform's callback destination. Safe to
    // import — that module has no service dependencies, so it cannot close a cycle back into here.
    WebhookOutboxModule,
    // 2026-09-04: the AI results-ready mail (BilateralAiService.sendResultsReadyEmail).
    EmailNotificationManagementModule,
    // 2026-09-05: the submitted-for-review in-app notification to the primary Science Program
    // (BilateralService.emitBilateralSubmittedNotification). No cycle: NotificationModule imports
    // SocketManagement, Versioning, forwardRef(ShareResultRequest) and bare entities — nothing
    // that imports back into this module.
    NotificationModule,
    // `ADE-T-4`: `BilateralAiEvidenceTransferService` reuses `SharePointService` for the
    // server-side upload and `EvidenceSharepointRepository` transitively via `saveSPData`.
    // `EvidencesModule` (already imported above) exports `EvidencesRepository`/`EvidencesService`
    // but not `SharePointService` itself (`design.md` §13 out-of-band note), hence this import.
    SharePointModule,
  ],
  controllers: [
    BilateralWebhookController,
    // @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-5) — registered before
    // BilateralCenterController. Not strictly required today (every route Nest would need
    // to disambiguate under `center/*` — `projects`, `create-header`, `change-type/:id`,
    // `primary-assignment/:id`, `submit-for-review/:id`, `planned-result/:id`,
    // `toc-mapping/:id`, `contributors/:id` — has a literal first segment, so none can
    // shadow the literal `center/handoff`), but registering it first keeps this controller
    // safe against a future `center/:param`-shaped route being added ahead of it.
    BilateralHandoffController,
    BilateralCenterController,
    BilateralController,
    BilateralAiController,
    BilateralAiConsumer,
  ],
  providers: [
    ClarisaApiKeyValidationService,
    ClarisaApiKeyGuard,
    BilateralService,
    BilateralProjectsService,
    BilateralCenterService,
    InnovationUseMdsValidator,
    KnowledgeProductBilateralHandler,
    CapacityChangeBilateralHandler,
    InnovationDevelopmentBilateralHandler,
    InnovationUseBilateralHandler,
    PolicyChangeBilateralHandler,
    NoopBilateralHandler,
    ResultsInnovationsDevRepository,
    ResultsInnovationsUseRepository,
    ResultsCapacityDevelopmentsRepository,
    ResultsPolicyChangesRepository,
    NonPooledProjectBudgetRepository,
    ActorTypeRepository,
    TemplateRepository,
    BilateralVersioningService,
    BilateralAiService,
    BilateralAiFileStorageService,
    BilateralAiTextMiningService,
    // `APF-T-3`: the terminal-notification writer (in-app row + mail) shared by `processJob`'s
    // COMPLETED/FAILED branches and the sweeper below, and the sweeper cron itself. No dedicated
    // `bilateral-ai.module.ts` exists — this module is where every other `bilateral-ai/*`
    // provider is already registered, so these two follow the same wiring rather than starting a
    // module split this task was not asked to do.
    BilateralAiNotificationsService,
    // `ADE-T-4` (`docs/specs/bilateral/ai-draft-evidence-promotion`): the evidence transfer step
    // `promoteDraft` calls once, after the `status_id` write. No dedicated `bilateral-ai.module.ts`
    // exists (see the note on `BilateralAiNotificationsService` above) — registered here with
    // every other `bilateral-ai/*` provider.
    BilateralAiEvidenceTransferService,
    BilateralAiSweeperCron,
    BilateralWebhookService,
    // @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-4) — RoleByUserRepository,
    // ClarisaCentersRepository, ClarisaInstitutionsRepository, UserRepository and
    // VersioningService are already resolvable here via RoleByUserModule, ClarisaCentersModule,
    // ClarisaInstitutionsModule, UserModule and VersioningModule (all imported above) — no new
    // module imports needed.
    BilateralHandoffService,
    // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-2) — thin repository over
    // `bilateral_quality_assessments`; T-6/T-7 inject it directly, same module, no export needed.
    BilateralQualityAssessmentRepository,
    // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4) — definitions-only payload
    // builder for the AI traffic light. Depends only on `BilateralService`, `ResultsService`
    // (both already resolvable in this module) and the indicator-description resolver below —
    // no new module imports, so no new cross-module cycle. T-6 injects it directly for the
    // orchestrator; no export needed (mirrors the T-2 repository above).
    BilateralQualityPayloadBuilder,
    // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-5/T-5b) — the outbound AI HTTP
    // client (`HttpService` from `HttpModule`, already imported above). Never registered by
    // T-5/T-5b themselves (both tasks unit-test it via `new BilateralQualityAssessmentClient()`
    // directly); `T-6` is its first consumer through Nest DI, so this is where it first needs
    // a provider entry.
    BilateralQualityAssessmentClient,
    // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6) — the orchestrator
    // (`assess`/`getLatest`). Depends only on the repository, builder and client above plus
    // `ResultsKnowledgeProductsRepository` (already a provider here for the KP handler and
    // `BilateralCenterService`) — no new module imports. Injected into `BilateralCenterService`
    // as a collaborator (`BIL-QAI-DD-5`); no export needed.
    BilateralQualityAssessmentService,
    // Concrete `IndicatorDescriptionResolver` (see
    // `./services/quality-assessment/indicator-description-resolver.ts` for why no existing
    // provider in this module's reach could fill the token instead): queries
    // `${DB_TOC}.toc_results_indicators` directly through the already-injected `DataSource`,
    // the same connection `BilateralService` itself already uses for raw queries.
    TocIndicatorDescriptionResolver,
    {
      provide: INDICATOR_DESCRIPTION_RESOLVER,
      useExisting: TocIndicatorDescriptionResolver,
    },
    HandlersError,
    AoWBilateralRepository,
  ],
  // P2-3166: the webhook dispatcher builds its payload from `BilateralService.findOne`, reusing the
  // enrichment path that already serves `GET /api/bilateral/results` instead of writing a second
  // serializer for the same document. Safe direction — `WebhookDispatchModule` imports this one and
  // nothing imports it back.
  exports: [BilateralService],
})
export class BilateralModule {}
