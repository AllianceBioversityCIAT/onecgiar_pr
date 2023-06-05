import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { DynamodbLogsService } from './dynamodb-logs.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { CreateDynamodbLogDto } from './dto/create-dynamodb-log.dto';

@Controller()
export class DynamodbLogsController {
  constructor(private readonly _dynamodbLogsService: DynamodbLogsService) {}

  @Get()
  async findAll() {
    return await this._dynamodbLogsService.findAll();
  }

  @Post()
  async createLog(
    @Body() createDynamodbLogDto: CreateDynamodbLogDto,
    @UserToken() user: TokenDto,
  ) {
    return await this._dynamodbLogsService.create(createDynamodbLogDto, user);
  }
}
