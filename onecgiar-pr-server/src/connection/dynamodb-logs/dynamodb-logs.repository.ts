import { Injectable } from '@nestjs/common';
import { Model } from 'dynamoose/dist/Model';
import { LogsSchemaDto } from './dto/logsSchema.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ddbClient } from 'src/config/dynamo.config';
import { PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { LogsModel } from './entities/dynamodb-log.schema';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { Actions } from './dto/enumAction.const';
import { Result } from '../../api/results/entities/result.entity';

@Injectable()
export class LogRepository {
  private readonly logsModel: Model;
  constructor(private readonly _handlersError: HandlersError) {}

  async findById(id: number): Promise<LogsSchemaDto> {
    try {
      const params = {
        TableName: 'reporting_logs_test',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': { N: `${id}` },
        },
      };

      const { Items } = <{ Items: any[] }>(
        await ddbClient.send(new ScanCommand(params))
      );
      return Items.length ? Items[0] : null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LogRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async findAll(): Promise<LogsSchemaDto[]> {
    try {
      const params = {
        TableName: 'reporting_logs_test',
      };

      const { Items } = <{ Items: any[] }>(
        await ddbClient.send(new ScanCommand(params))
      );
      return Items;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LogRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async findByResultCode(resultCode: number): Promise<LogsSchemaDto[]> {
    try {
      const params = {
        TableName: 'reporting_logs_test',
        FilterExpression: 'onResultCode = :onResultCode',
        ExpressionAttributeValues: {
          ':onResultCode': { N: `${resultCode}` },
        },
      };

      const { Items } = <{ Items: any[] }>(
        await ddbClient.send(new ScanCommand(params))
      );
      return Items;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LogRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async findByUser(userId: number): Promise<LogsSchemaDto[]> {
    try {
      const params = {
        TableName: 'reporting_logs_test',
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': { N: `${userId}` },
        },
      };

      const { Items } = <{ Items: any[] }>(
        await ddbClient.send(new ScanCommand(params))
      );
      return Items;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LogRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async createLog(
    resultData: Result,
    user: TokenDto,
    action: Actions,
    actionInfo?: { class?: string; method?: string },
    moreInfo?: string,
    objBefore?: any,
    objAfter?: any,
  ): Promise<LogsSchemaDto[]> {
    try {
      console.log(`start createLog`);
      const dataLog = new LogsModel(
        action,
        user,
        resultData,
        actionInfo,
        moreInfo,
        objBefore,
        objAfter,
      );
      const params = {
        TableName: 'reporting_logs_test',
        Item: dataLog.getDataInsert(),
      };
      console.log('paramas: ', params);
      return await ddbClient
        .send(new PutItemCommand(params))
        .then((data) => {
          console.log('data: ', data);
          return (data as any)?.Item;
        })
        .catch((error) => {
          console.log('error: ', error);
          return error;
        });
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LogRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
