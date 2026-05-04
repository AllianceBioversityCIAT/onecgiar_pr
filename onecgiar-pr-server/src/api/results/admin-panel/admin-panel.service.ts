import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { AdminPanelRepository } from './admin-panel.repository';
import { FilterInitiativesDto } from './dto/filter-initiatives.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsKnowledgeProductsService } from '../results-knowledge-products/results-knowledge-products.service';
import { ResultsKnowledgeProduct } from '../results-knowledge-products/entities/results-knowledge-product.entity';
import { ModuleRef } from '@nestjs/core';
import { FilterResultsDto } from './dto/filter-results.dto';
import { ResultRepository } from '../result.repository';
import { ResultTypeDto } from '../dto/result-types.dto';
import { ResultsPolicyChangesRepository } from '../summary/repositories/results-policy-changes.repository';
import { ResultsInnovationsUseRepository } from '../summary/repositories/results-innovations-use.repository';
import { ResultsCapacityDevelopmentsRepository } from '../summary/repositories/results-capacity-developments.repository';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';
import { BulkKpDto } from './dto/bulk-kp.dto';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { PhaseInitiativeReportingAccess } from './entities/phase-initiative-reporting-access.entity';
import { Version } from '../../versioning/entities/version.entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { PatchPhaseInitiativeReportingDto } from './dto/patch-phase-initiative-reporting.dto';
import { BulkPhaseInitiativeReportingDto } from './dto/bulk-phase-initiative-reporting.dto';

const REPORTING_CATEGORY_COLORS = [
  '#f59e0b',
  '#ef4444',
  '#84cc16',
  '#fb923c',
  '#10b981',
  '#92400e',
  '#3b82f6',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
  '#8b5cf6',
  '#d946ef',
  '#65a30d',
];

@Injectable()
export class AdminPanelService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(AdminPanelService.name);
  private _resultsKnowledgeProductsService: ResultsKnowledgeProductsService;

  constructor(
    private _handlersError: HandlersError,
    private _adminPanelRepository: AdminPanelRepository,
    private _moduleRef: ModuleRef,
    private _resultRepository: ResultRepository,
    private _resultsPolicyChangesRepository: ResultsPolicyChangesRepository,
    private _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
    private _resultsCapacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    @InjectRepository(PhaseInitiativeReportingAccess)
    private readonly _phaseInitiativeReportingRepo: Repository<PhaseInitiativeReportingAccess>,
    @InjectRepository(Version)
    private readonly _versionRepo: Repository<Version>,
    @InjectRepository(ClarisaInitiative)
    private readonly _clarisaInitiativeRepo: Repository<ClarisaInitiative>,
  ) {}

  async onModuleInit() {
    this._resultsKnowledgeProductsService = await this._moduleRef.resolve(
      ResultsKnowledgeProductsService,
    );
  }

  async reportResultCompleteness(filterIntiatives: FilterInitiativesDto) {
    try {
      const results =
        await this._adminPanelRepository.reportResultCompleteness(
          filterIntiatives,
        );
      return {
        response: results,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async excelFullReportByResultCodes(filterResults: FilterResultsDto) {
    let resultIds = [];
    if (filterResults?.fullReport) {
      resultIds = (await this._resultRepository.getActiveResultCodes()).map(
        (r) => r.id,
      );
    } else {
      resultIds = filterResults?.resultIds ?? [];
    }

    try {
      let fullReport: any[];

      // gets the base report (sections 1 to 6)
      const baseReport =
        await this._resultRepository.getBasicResultDataForReport(resultIds);
      fullReport = [...baseReport];

      const resultTypes: ResultTypeDto[] =
        await this._resultRepository.getTypesOfResultByCodes(resultIds);

      const resultsByTypes = new Map<number, ResultTypeDto[]>();
      resultTypes.forEach((rt) => {
        const results = resultsByTypes.get(rt.typeId);
        if (!results) {
          resultsByTypes.set(rt.typeId, [rt]);
        } else {
          resultsByTypes.set(rt.typeId, [rt, ...results]);
        }
      });

      let policyChanges: any[],
        innovationUses: any[],
        capdev: any[],
        kps: any[],
        innovationDevelopments: any[];

      if (resultsByTypes.get(1)) {
        // has policy changes
        policyChanges =
          await this._resultsPolicyChangesRepository.getSectionSevenDataForReport(
            resultsByTypes.get(1).map((r) => r.resultCode),
          );

        fullReport = fullReport.map((fr) => {
          const pc = policyChanges.find(
            (pc) => pc['Result Code'] == fr['Result Code'],
          );
          if (pc) {
            delete pc['Result Code'];
            delete pc['Result ID'];
            fr = {
              ...fr,
              ...pc,
            };
          }

          return fr;
        });
      }

      if (resultsByTypes.get(2)) {
        // has innovation uses
        innovationUses =
          await this._resultsInnovationsUseRepository.getSectionSevenDataForReport(
            resultsByTypes.get(2).map((r) => r.resultCode),
          );

        fullReport = fullReport.map((fr) => {
          const iu = innovationUses.find(
            (iu) => iu['Result Code'] == fr['Result Code'],
          );
          if (iu) {
            delete iu['Result Code'];
            delete iu['Result ID'];
            fr = {
              ...fr,
              ...iu,
            };
          }

          return fr;
        });
      }

      if (resultsByTypes.get(5)) {
        // has capdev
        capdev =
          await this._resultsCapacityDevelopmentsRepository.getSectionSevenDataForReport(
            resultsByTypes.get(5).map((r) => r.resultCode),
          );

        fullReport = fullReport.map((fr) => {
          const cd = capdev.find(
            (cd) => cd['Result Code'] == fr['Result Code'],
          );
          if (cd) {
            delete cd['Result Code'];
            delete cd['Result ID'];
            fr = {
              ...fr,
              ...cd,
            };
          }

          return fr;
        });
      }

      if (resultsByTypes.get(6)) {
        // has kps
        const kpsResponse =
          await this._resultsKnowledgeProductsService.getSectionSevenDataForReport(
            resultsByTypes.get(6).map((r) => r.resultCode),
          );

        if (kpsResponse.status < 300) {
          kps = kpsResponse.response;

          fullReport = fullReport.map((fr) => {
            const kp = kps.find((kp) => kp['Result Code'] == fr['Result Code']);
            if (kp) {
              delete kp['Result Code'];
              delete kp['Result ID'];
              fr = {
                ...fr,
                ...kp,
              };
            }

            return fr;
          });
        }
      }

      if (resultsByTypes.get(7)) {
        // has innovation developments
        innovationDevelopments =
          await this._resultsInnovationsDevRepository.getSectionSevenDataForReport(
            resultsByTypes.get(7).map((r) => r.resultCode),
          );

        fullReport = fullReport.map((fr) => {
          const id = innovationDevelopments.find(
            (id) => id['Result Code'] == fr['Result Code'],
          );
          if (id) {
            delete id['Result Code'];
            delete id['Result ID'];
            fr = {
              ...fr,
              ...id,
            };
          }

          return fr;
        });
      }

      //adding TOC related data (SDG and targets, Impact Area and targets)
      const tocData =
        await this._resultRepository.getTocDataForReport(resultIds);

      fullReport = fullReport.map((fr) => {
        const td = tocData.find((td) => td['Result Code'] == fr['Result Code']);
        if (td) {
          delete td['Result Code'];
          delete td['Result ID'];
          fr = {
            ...fr,
            ...td,
          };
        }

        return fr;
      });

      const resultLevels = await this._resultRepository.find({
        select: ['result_level_id'],
        where: resultIds.map((rc) => ({ id: rc })),
      });

      let resultsAgaintsToc: any[];

      if (
        resultLevels[0].result_level_id == 3 ||
        resultLevels[0].result_level_id == 4
      ) {
        resultsAgaintsToc =
          await this._resultRepository.getResultAgainstToc(resultIds);
      }

      return {
        response: { fullReport, resultsAgaintsToc },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async excelFullReportByResultByInitiative(
    initiativeId: number,
    phase: number,
  ) {
    try {
      let fullReport: any[];

      // gets the base report (sections 1 to 6)
      const baseReport =
        await this._resultRepository.getBasicResultDataForReportByInitiative(
          initiativeId,
          phase,
        );
      fullReport = [...baseReport];

      const resultTypes: ResultTypeDto[] =
        await this._resultRepository.getTypesOfResultByInitiative(
          initiativeId,
          phase,
        );

      const resultsByTypes = new Map<number, ResultTypeDto[]>();
      resultTypes.forEach((rt) => {
        const results = resultsByTypes.get(rt.typeId);
        if (!results) {
          resultsByTypes.set(rt.typeId, [rt]);
        } else {
          resultsByTypes.set(rt.typeId, [rt, ...results]);
        }
      });

      let policyChanges: any[],
        innovationUses: any[],
        capdev: any[],
        kps: any[],
        innovationDevelopments: any[];

      if (resultsByTypes.get(1)) {
        // has policy changes
        policyChanges =
          await this._resultsPolicyChangesRepository.getSectionSevenDataForReport(
            resultsByTypes.get(1).map((r) => r.resultCode),
            phase,
          );

        fullReport = fullReport.map((fr) => {
          const pc = policyChanges.find(
            (pc) => pc['Result Code'] == fr['Result Code'],
          );
          if (pc) {
            delete pc['Result Code'];
            delete pc['Result ID'];
            fr = {
              ...fr,
              ...pc,
            };
          }

          return fr;
        });
      }

      if (resultsByTypes.get(2)) {
        // has innovation uses
        innovationUses =
          await this._resultsInnovationsUseRepository.getSectionSevenDataForReport(
            resultsByTypes.get(2).map((r) => r.resultCode),
            phase,
          );

        fullReport = fullReport.map((fr) => {
          const iu = innovationUses.find(
            (iu) => iu['Result Code'] == fr['Result Code'],
          );
          if (iu) {
            delete iu['Result Code'];
            delete iu['Result ID'];
            fr = {
              ...fr,
              ...iu,
            };
          }

          return fr;
        });
      }

      if (resultsByTypes.get(5)) {
        // has capdev
        capdev =
          await this._resultsCapacityDevelopmentsRepository.getSectionSevenDataForReport(
            resultsByTypes.get(5).map((r) => r.resultCode),
            phase,
          );

        fullReport = fullReport.map((fr) => {
          const cd = capdev.find(
            (cd) => cd['Result Code'] == fr['Result Code'],
          );
          if (cd) {
            delete cd['Result Code'];
            delete cd['Result ID'];
            fr = {
              ...fr,
              ...cd,
            };
          }

          return fr;
        });
      }

      if (resultsByTypes.get(6)) {
        // has kps
        const kpsResponse =
          await this._resultsKnowledgeProductsService.getSectionSevenDataForReport(
            resultsByTypes.get(6).map((r) => r.resultCode),
            phase,
          );

        if (kpsResponse.status < 300) {
          kps = kpsResponse.response;

          fullReport = fullReport.map((fr) => {
            const kp = kps.find((kp) => kp['Result Code'] == fr['Result Code']);
            if (kp) {
              delete kp['Result Code'];
              delete kp['Result ID'];
              fr = {
                ...fr,
                ...kp,
              };
            }

            return fr;
          });
        }
      }

      if (resultsByTypes.get(7)) {
        // has innovation developments
        innovationDevelopments =
          await this._resultsInnovationsDevRepository.getSectionSevenDataForReport(
            resultsByTypes.get(7).map((r) => r.resultCode),
            phase,
          );

        fullReport = fullReport.map((fr) => {
          const id = innovationDevelopments.find(
            (id) => id['Result Code'] == fr['Result Code'],
          );
          if (id) {
            delete id['Result Code'];
            delete id['Result ID'];
            fr = {
              ...fr,
              ...id,
            };
          }

          return fr;
        });
      }

      //adding TOC related data (SDG and targets, Impact Area and targets)
      const tocData =
        await this._resultRepository.getTocDataForReportByInitiative(
          initiativeId,
          phase,
        );

      fullReport = fullReport.map((fr) => {
        const td = tocData.find((td) => td['Result Code'] == fr['Result Code']);
        if (td) {
          delete td['Result Code'];
          delete td['Result ID'];
          fr = {
            ...fr,
            ...td,
          };
        }

        return fr;
      });

      return {
        response: fullReport,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async submissionsByResults(resultId: number) {
    try {
      const submissions =
        await this._adminPanelRepository.submissionsByResults(resultId);
      return {
        response: submissions,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async userReport() {
    try {
      const users = await this._adminPanelRepository.userReport();
      return {
        response: users,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async kpBulkSync(
    user: TokenDto,
    status: string,
    phases: number,
    bulkKpDto: BulkKpDto,
  ) {
    try {
      const allKpsResponse =
        await this._resultsKnowledgeProductsService.findByFilterActiveKps({
          resultStatus: ResultStatusData.getFromName(status)?.value,
          resultCodes: bulkKpDto.results_code,
          phase: phases,
        });

      if (allKpsResponse.statusCode >= 300) {
        throw this._handlersError.returnErrorRes({ error: allKpsResponse });
      }

      const kps = allKpsResponse.response as ResultsKnowledgeProduct[];
      //kps = kps.filter((kp) => !kp.isJournalArticle);

      const initDate: Date = new Date();
      this._logger.debug(
        `Bulk sync process started at ${initDate}. Sync for ${kps.length} kp(s).`,
      );

      const responses: {
        response: any;
        message: string;
        status: HttpStatus;
        handle: string;
      }[] = [];

      for (const kp of kps) {
        this._logger.debug(
          `Current KP ID: ${kp.result_knowledge_product_id}; Current Result ID: ${kp.results_id}; Current Result code: ${kp.result_object.result_code}; Current Phase Id: ${kp.result_object.version_id};`,
        );

        const response = await this._resultsKnowledgeProductsService.syncAgain(
          kp.results_id,
          user,
        );

        responses.push({ ...response, handle: kp.handle });
      }

      const endDate: Date = new Date();
      const successful = responses.filter(
        (res) => res.status === HttpStatus.CREATED,
      );
      const failed = responses.filter(
        (res) => res.status !== HttpStatus.CREATED,
      );

      this._logger.debug(
        `Bulk sync process finished at ${endDate}. Time took: ${
          endDate.getMilliseconds() - initDate.getMilliseconds()
        }ms.`,
      );

      this._logger.debug(
        `KPs successfully updated: ${successful.length}; KPs re-sync failed: ${failed.length}`,
      );

      failed.forEach((f) =>
        this._logger.error(`"${f.message}" for handle "${f.handle}"`),
      );

      return {
        response: '1',
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  // --- Phase × initiative reporting access (P2-2821) ---

  async getPhaseReportingInitiativesDetail(phaseId: number) {
    try {
      const phase = await this._loadReportingPhase(phaseId);
      if (!phase) {
        return {
          response: null,
          message: 'Phase not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const initiatives = await this._getEligibleInitiatives(phase);
      const accessRows = await this._phaseInitiativeReportingRepo.find({
        where: { version_id: phaseId },
      });
      const accessMap = new Map(
        accessRows.map((r) => [r.initiative_id, r.reporting_enabled]),
      );
      const science_programs = initiatives.map((ci, idx) => {
        const override = accessMap.get(ci.id);
        const reporting_enabled = override ?? true;
        return {
          id: ci.id,
          official_code: ci.official_code,
          name: ci.name,
          category: this._mapInitiativeCategory(ci),
          reporting_enabled,
          color:
            REPORTING_CATEGORY_COLORS[idx % REPORTING_CATEGORY_COLORS.length],
        };
      });
      return {
        response: {
          phase: {
            id: phase.id,
            phase_name: phase.phase_name,
            phase_year: phase.phase_year,
            status: phase.status,
            start_date: phase.start_date,
            end_date: phase.end_date,
            portfolio: phase.obj_portfolio
              ? {
                  id: phase.obj_portfolio.id,
                  name: phase.obj_portfolio.name,
                  acronym: phase.obj_portfolio.acronym ?? '',
                }
              : null,
          },
          science_programs,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * Effective reporting flag for an initiative in a reporting phase (for guards / UI).
   * Returns false if phase is invalid, closed, or initiative not in scope.
   */
  async isInitiativeReportingEnabled(
    phaseId: number,
    initiativeId: number,
  ): Promise<boolean> {
    const phase = await this._loadReportingPhase(phaseId);
    if (!phase?.status) return false;
    const eligible = await this._getEligibleInitiatives(phase);
    if (!eligible.some((i) => i.id === initiativeId)) return false;
    const row = await this._phaseInitiativeReportingRepo.findOne({
      where: { version_id: phaseId, initiative_id: initiativeId },
    });
    if (!row) return true;
    return row.reporting_enabled;
  }

  async getInitiativeReportingStatus(phaseId: number, initiativeId: number) {
    try {
      const phase = await this._loadReportingPhase(phaseId);
      if (!phase) {
        return {
          response: null,
          message: 'Phase not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const eligible = await this._getEligibleInitiatives(phase);
      const ok = eligible.some((i) => i.id === initiativeId);
      if (!ok) {
        return {
          response: null,
          message: 'Initiative is not in scope for this reporting phase',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const row = await this._phaseInitiativeReportingRepo.findOne({
        where: { version_id: phaseId, initiative_id: initiativeId },
      });
      const reporting_enabled = row?.reporting_enabled ?? true;
      return {
        response: {
          phase_id: phaseId,
          initiative_id: initiativeId,
          reporting_enabled,
          phase_open: phase.status,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async patchPhaseInitiativeReporting(
    phaseId: number,
    initiativeId: number,
    dto: PatchPhaseInitiativeReportingDto,
  ) {
    try {
      const err = await this._ensurePhaseOpenForMutation(phaseId);
      if (err) return err;
      const phase = await this._loadReportingPhase(phaseId);
      const eligible = await this._getEligibleInitiatives(phase);
      const ci = eligible.find((i) => i.id === initiativeId);
      if (!ci) {
        return {
          response: null,
          message: 'Initiative is not in scope for this reporting phase',
          status: HttpStatus.NOT_FOUND,
        };
      }
      if (dto.reporting_enabled) {
        await this._phaseInitiativeReportingRepo.delete({
          version_id: phaseId,
          initiative_id: initiativeId,
        });
      } else {
        await this._phaseInitiativeReportingRepo.upsert(
          {
            version_id: phaseId,
            initiative_id: initiativeId,
            reporting_enabled: false,
          },
          { conflictPaths: ['version_id', 'initiative_id'] },
        );
      }
      const idx = eligible.findIndex((i) => i.id === initiativeId);
      return {
        response: {
          id: ci.id,
          official_code: ci.official_code,
          name: ci.name,
          category: this._mapInitiativeCategory(ci),
          reporting_enabled: dto.reporting_enabled,
          color:
            REPORTING_CATEGORY_COLORS[
              Math.max(0, idx) % REPORTING_CATEGORY_COLORS.length
            ],
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async patchPhaseInitiativeReportingBulk(
    phaseId: number,
    dto: BulkPhaseInitiativeReportingDto,
  ) {
    try {
      const err = await this._ensurePhaseOpenForMutation(phaseId);
      if (err) return err;
      const phase = await this._loadReportingPhase(phaseId);
      const eligible = await this._getEligibleInitiatives(phase);
      const ids = eligible.map((i) => i.id);
      if (dto.reporting_enabled) {
        await this._phaseInitiativeReportingRepo.delete({
          version_id: phaseId,
        });
      } else if (ids.length) {
        await this._phaseInitiativeReportingRepo.upsert(
          ids.map((initiative_id) => ({
            version_id: phaseId,
            initiative_id,
            reporting_enabled: false,
          })),
          { conflictPaths: ['version_id', 'initiative_id'] },
        );
      }
      const accessRows = await this._phaseInitiativeReportingRepo.find({
        where: { version_id: phaseId },
      });
      const accessMap = new Map(
        accessRows.map((r) => [r.initiative_id, r.reporting_enabled]),
      );
      const science_programs = eligible.map((ci, idx) => ({
        id: ci.id,
        official_code: ci.official_code,
        name: ci.name,
        category: this._mapInitiativeCategory(ci),
        reporting_enabled: accessMap.get(ci.id) ?? true,
        color:
          REPORTING_CATEGORY_COLORS[idx % REPORTING_CATEGORY_COLORS.length],
      }));
      return {
        response: science_programs,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async _loadReportingPhase(phaseId: number): Promise<Version | null> {
    return this._versionRepo.findOne({
      where: { id: phaseId },
      relations: ['obj_portfolio'],
    });
  }

  private async _ensurePhaseOpenForMutation(phaseId: number) {
    const phase = await this._loadReportingPhase(phaseId);
    if (!phase) {
      return {
        response: null,
        message: 'Phase not found',
        status: HttpStatus.NOT_FOUND,
      };
    }
    if (!phase.status) {
      return {
        response: null,
        message: 'Phase must be open to change reporting access',
        status: HttpStatus.BAD_REQUEST,
      };
    }
    return null;
  }

  private async _getEligibleInitiatives(
    phase: Version,
  ): Promise<ClarisaInitiative[]> {
    if (!phase.portfolio_id) return [];
    const list = await this._clarisaInitiativeRepo.find({
      where: { active: true, portfolio_id: phase.portfolio_id },
      relations: ['obj_cgiar_entity_type'],
    });
    return list.filter((ci) => this._isReportingEligibleType(ci));
  }

  private _isReportingEligibleType(ci: ClarisaInitiative): boolean {
    const n = (ci.obj_cgiar_entity_type?.name || '').toLowerCase();
    return (
      n.includes('science') ||
      n.includes('accelerator') ||
      n.includes('scaling') ||
      n.includes('genebank')
    );
  }

  private _mapInitiativeCategory(ci: ClarisaInitiative): string {
    const n = (ci.obj_cgiar_entity_type?.name || '').toLowerCase();
    if (n.includes('accelerator') || n.includes('genebank'))
      return 'Accelerators';
    if (n.includes('scaling')) return 'Scaling programs';
    if (n.includes('science')) return 'Science programs';
    return ci.obj_cgiar_entity_type?.name || 'Other';
  }
}
