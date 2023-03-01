import {
  Headers,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateAdminPanelDto } from './dto/create-admin-panel.dto';
import { UpdateAdminPanelDto } from './dto/update-admin-panel.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { AdminPanelRepository } from './admin-panel.repository';
import { FilterInitiativesDto } from './dto/filter-initiatives.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
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
  ) {}

  async onModuleInit() {
    this._resultsKnowledgeProductsService = await this._moduleRef.resolve(
      ResultsKnowledgeProductsService,
    );
  }

  create(createAdminPanelDto: CreateAdminPanelDto) {
    return 'This action adds a new adminPanel';
  }

  async reportResultCompleteness(filterIntiatives: FilterInitiativesDto) {
    try {
      const results = await this._adminPanelRepository.reportResultCompleteness(
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
    let resultCodes = [];
    if (filterResults?.fullReport) {
      resultCodes = (await this._resultRepository.getActiveResultCodes()).map(
        (r) => r.result_code,
      );
    } else {
      resultCodes = filterResults?.resultCodes ?? [];
    }

    try {
      let fullReport: any[];

      // gets the base report (sections 1 to 6)
      const baseReport =
        await this._resultRepository.getBasicResultDataForReport(resultCodes);
      fullReport = [...baseReport];

      let resultTypes: ResultTypeDto[] =
        await this._resultRepository.getTypesOfResultByCodes(resultCodes);

      let resultsByTypes = new Map<number, ResultTypeDto[]>();
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
      const tocData = await this._resultRepository.getTocDataForReport(
        resultCodes,
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

  async excelFullReportByResultByInitiative(initiativeId: number) {
    try {
      let fullReport: any[];

      // gets the base report (sections 1 to 6)
      const baseReport =
        await this._resultRepository.getBasicResultDataForReportByInitiative(
          initiativeId,
        );
      fullReport = [...baseReport];

      let resultTypes: ResultTypeDto[] =
        await this._resultRepository.getTypesOfResultByInitiative(initiativeId);

      let resultsByTypes = new Map<number, ResultTypeDto[]>();
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
        await this._resultRepository.getTocDataForReportByInitiative(
          initiativeId,
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
      const submissions = await this._adminPanelRepository.submissionsByResults(
        resultId,
      );
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

  async kpBulkSync(user: TokenDto) {
    try {
      const allKpsResponse =
        await this._resultsKnowledgeProductsService.findAllActiveKps();

      if (allKpsResponse.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: allKpsResponse });
      }

      const kps = allKpsResponse.response as ResultsKnowledgeProduct[];
      //kps = kps.filter((kp) => !kp.isJournalArticle);

      const initDate: Date = new Date();
      this._logger.debug(
        `Bulk sync process started at ${initDate}. Sync for ${kps.length} kp(s).`,
      );

      let responses: {
        response: any;
        message: string;
        status: HttpStatus;
        handle: string;
      }[] = [];

      for (const kp of kps) {
        this._logger.debug(
          `Current KP ID: ${kp.result_knowledge_product_id}; Current Result ID: ${kp.results_id}`,
        );

        const response = await this._resultsKnowledgeProductsService.syncAgain(
          kp.results_id,
          user,
        );

        responses.push({ ...response, handle: kp.handle });
      }

      const endDate: Date = new Date();
      let successful = responses.filter(
        (res) => res.status === HttpStatus.CREATED,
      );
      let failed = responses.filter((res) => res.status !== HttpStatus.CREATED);

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
}
