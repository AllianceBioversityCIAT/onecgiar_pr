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

@Injectable()
export class AdminPanelService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(AdminPanelService.name);
  private readonly _isFulfilled = <T>(
    p: PromiseSettledResult<T>,
  ): p is PromiseFulfilledResult<T> => p.status === 'fulfilled';
  private readonly _isRejected = <T>(
    p: PromiseSettledResult<T>,
  ): p is PromiseRejectedResult => p.status === 'rejected';
  private _resultsKnowledgeProductsService: ResultsKnowledgeProductsService;

  constructor(
    private _handlersError: HandlersError,
    private _adminPanelRepository: AdminPanelRepository,
    private _moduleRef: ModuleRef,
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

      const initDate: Date = new Date();
      this._logger.debug(
        `Bulk sync process started at ${initDate}. Sync for ${kps.length} kp(s).`,
      );

      Promise.allSettled(
        kps.map(async (kp) => {
          this._logger.debug(
            `Current KP ID: ${kp.result_knowledge_product_id}; Current Result ID: ${kp.results_id}`,
          );
          return this._resultsKnowledgeProductsService.syncAgain(
            kp.results_id,
            user,
          );
        }),
      ).then((responses) => {
        const endDate: Date = new Date();
        this._logger.debug(
          `Bulk sync process finished at ${endDate}. Time took: ${
            endDate.getMilliseconds() - initDate.getMilliseconds()
          }ms.`,
        );
        this._logger.debug(
          `KPs successfully updated: ${
            responses.filter(this._isFulfilled).length
          }; KPs re-sync failed: ${responses.filter(this._isRejected).length}`,
        );
      });

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
