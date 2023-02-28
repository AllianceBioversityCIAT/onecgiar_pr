import { Injectable } from '@nestjs/common';
import * as dynamoose from 'dynamoose';
import { Model } from 'dynamoose/dist/Model';
import { LogsSchemaDto } from './dto/logsSchema.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ddbClient } from 'src/config/dynamo.config';
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DescribeTableCommand, PutItemCommand, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { LogsModel } from './entities/dynamodb-log.schema';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { CreateDynamodbLogDto } from './dto/create-dynamodb-log.dto';
import { Actions } from './dto/enumAction.const';
import { Number } from 'aws-sdk/clients/iot';


@Injectable()
export class LogRepository {
    private readonly logsModel: Model;
    constructor(
        private readonly _handlersError: HandlersError,
    ) {}

    async findById(id: number): Promise<LogsSchemaDto> {
        try {
            const params = {
                TableName: "reporting_logs_test",
                FilterExpression: "id = :id",
                ExpressionAttributeValues: {
                    ":id": { N: `${id}` }
                }
            };

            const { Items } = <{ Items: any[] }>await ddbClient.send(new ScanCommand(params));
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
                TableName: "reporting_logs_test"
            };

            const { Items } = <{ Items: any[] }>await ddbClient.send(new ScanCommand(params));
            return Items;
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: LogRepository.name,
                error: error,
                debug: true,
            });
        }
    }

    async findByResultCode(resultCode: Number): Promise<LogsSchemaDto[]> {
        try {
            const params = {
                TableName: "reporting_logs_test",
                FilterExpression: "onResultCode = :onResultCode",
                ExpressionAttributeValues: {
                    ":onResultCode": { N: `${resultCode}` }
                }
            };

            const { Items } = <{ Items: any[] }>await ddbClient.send(new ScanCommand(params));
            return Items;
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: LogRepository.name,
                error: error,
                debug: true,
            });
        }
    }

    async findByUser(userId: Number): Promise<LogsSchemaDto[]> {
        try {
            const params = {
                TableName: "reporting_logs_test",
                FilterExpression: "userId = :userId",
                ExpressionAttributeValues: {
                    ":userId": { N: `${userId}` }
                }
            };

            const { Items } = <{ Items: any[] }>await ddbClient.send(new ScanCommand(params));
            return Items;
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: LogRepository.name,
                error: error,
                debug: true,
            });
        }
    }

    async createLog(onResultCode: number, user: TokenDto, action: Actions, actionInfo?:{class?:string, method?: string} ,moreInfo?: string): Promise<LogsSchemaDto[]> {
        try {
            const dataLog = new LogsModel(action, user, onResultCode, actionInfo, moreInfo);
            const params = {
                TableName: "reporting_logs_test",
                Item: dataLog.getDataInsert()
            };
            console.log(params);

            const result = await ddbClient.send(new PutItemCommand(params));
            return result['Items'];
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: LogRepository.name,
                error: error,
                debug: true,
            });
        }
    }

}