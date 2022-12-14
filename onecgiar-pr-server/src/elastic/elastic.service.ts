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
    fromBulk: boolean = false,
  ): string {
    let isPatch: boolean = operation.operation === 'PATCH';
    let elasticOperation = `{ "${
      isPatch ? 'create' : 'delete'
    }" : { "_index" : "${documentName}", "_id" : "${operation.data['id']}"  } }
    ${isPatch ? JSON.stringify(operation.data) : ''}`;
    if (!fromBulk) {
      elasticOperation = elasticOperation.concat('\n');
    }

    return elasticOperation;
  }

  public getSingleElasticOperationResult(
    documentName: string,
    operation: ElasticOperationDto<ResultSimpleDto>,
    fromBulk: boolean = false,
  ): string {
    let isPatch: boolean = operation.operation === 'PATCH';
    operation.data['is_legacy'] =
      <unknown>operation.data['is_legacy'] === 'true';

    let elasticOperation = `{ "${
      isPatch ? 'index' : 'delete'
    }" : { "_index" : "${documentName}", "_id" : "${operation.data['id']}"  } }
    ${isPatch ? JSON.stringify(operation.data) : ''}`;
    if (!fromBulk) {
      elasticOperation = elasticOperation.concat('\n');
    }

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
          true,
        )),
    );
    bulkElasticOperations = bulkElasticOperations.concat('\n');

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
          true,
        )),
    );
    bulkElasticOperations = bulkElasticOperations.concat('\n');

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
