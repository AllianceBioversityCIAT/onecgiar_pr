import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ResultSimpleDto } from '../api/results/dto/result-simple.dto';
import { HandlersError } from '../shared/handlers/error.utils';
import { ElasticOperationDto } from './dto/elastic-operation.dto';
import { env } from 'process';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ElasticService {
  private readonly _logger: Logger = new Logger(ElasticService.name);
  private readonly _bulkElasticUrl = `${env.ELASTIC_URL}_bulk`;

  constructor(
    private readonly _http: HttpService,
    private readonly _handlersError: HandlersError,
  ) {}

  public getSingleElasticOperation<T>(
    documentName: string,
    operation: ElasticOperationDto<T>,
  ): string {
    let isPost: boolean = operation.operation === 'POST';
    let elasticOperation = `{ "${
      isPost ? 'create' : 'delete'
    }" : { "_index" : "${documentName}", "_id" : "${operation.data['id']}"  } }
    ${isPost ? JSON.stringify(operation.data) : ''}`;

    return elasticOperation;
  }

  public getSingleElasticOperationResult(
    documentName: string,
    operation: ElasticOperationDto<ResultSimpleDto>,
  ): string {
    let isPost: boolean = operation.operation === 'POST';
    operation.data['is_legacy'] =
      <unknown>operation.data['is_legacy'] === 'true';
    let elasticOperation = `{ "${
      isPost ? 'create' : 'delete'
    }" : { "_index" : "${documentName}", "_id" : "${operation.data['id']}"  } }
    ${isPost ? JSON.stringify(operation.data) : ''}`;

    return elasticOperation;
  }

  public getBulkElasticOperationResults(
    documentName: string,
    operation: ElasticOperationDto<ResultSimpleDto>[],
  ): string {
    let bulkElasticOperations = '';

    operation.forEach(
      (o) =>
        (bulkElasticOperations += this.getSingleElasticOperationResult(
          documentName,
          o,
        )),
    );

    return bulkElasticOperations;
  }

  public getBulkElasticOperations<T>(
    documentName: string,
    operation: ElasticOperationDto<T>[],
  ): string {
    let bulkElasticOperations = '';

    operation.forEach(
      (o) =>
        (bulkElasticOperations += this.getSingleElasticOperation(
          documentName,
          o,
        )),
    );

    return bulkElasticOperations;
  }

  public async sendBulkOperationToElastic(elasticJson: string) {
    try {
      let { data } = await lastValueFrom(
        this._http.post(this._bulkElasticUrl, elasticJson),
      );
      this._logger.debug(data);
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
