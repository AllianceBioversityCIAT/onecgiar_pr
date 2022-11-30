import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ResultSimpleDto } from '../api/results/dto/result-simple.dto';
import { HandlersError } from '../shared/handlers/error.utils';
import { ElasticOperationDto } from './dto/elastic-operation.dto';
import { env } from 'process';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ElasticService {
  private readonly _logger: Logger = new Logger(ElasticService.name);
  private readonly _bulkElasticUrl = `${env.ELASTIC_URL}_bulk`;
  private readonly _headers = {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.ELASTIC_USERNAME}:${env.ELASTIC_PASSWORD}`,
      ).toString('base64')}`,
      'Content-Type': 'application/x-ndjson',
    },
  };

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
        this._http.post(this._bulkElasticUrl, elasticJson, this._headers),
      );

      return {
        response: data,
        message: 'Successfully updated the elastic',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({
        error: error.response?.data,
        debug: true,
      });
    }
  }
}
