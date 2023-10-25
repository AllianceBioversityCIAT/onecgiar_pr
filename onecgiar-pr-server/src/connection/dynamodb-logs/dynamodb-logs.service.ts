import { Injectable } from '@nestjs/common';
import { CreateDynamodbLogDto } from './dto/create-dynamodb-log.dto';
import { UpdateDynamodbLogDto } from './dto/update-dynamodb-log.dto';
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

  findOne(id: number) {
    return `This action returns a #${id} dynamodbLog`;
  }

  update(id: number, updateDynamodbLogDto: UpdateDynamodbLogDto) {
    return `This action updates a #${id} dynamodbLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} dynamodbLog`;
  }
}
