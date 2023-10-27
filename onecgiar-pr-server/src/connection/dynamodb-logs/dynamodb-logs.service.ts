import { Injectable } from '@nestjs/common';
import { CreateDynamodbLogDto } from './dto/create-dynamodb-log.dto';
import { LogRepository } from './dynamodb-logs.repository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

@Injectable()
export class DynamodbLogsService {
  constructor(private readonly _logRepository: LogRepository) {}

  async create(
    { result, action, moreInfo }: CreateDynamodbLogDto,
    user: TokenDto,
  ) {
    return await this._logRepository.createLog(
      result,
      user,
      action,
      {
        class: DynamodbLogsService.name,
        method: `create`,
      },
      moreInfo,
    );
  }

  async findAll() {
    return await this._logRepository.findAll();
  }
}
