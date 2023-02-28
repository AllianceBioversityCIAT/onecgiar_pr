import { PartialType } from '@nestjs/mapped-types';
import { CreateDynamodbLogDto } from './create-dynamodb-log.dto';

export class UpdateDynamodbLogDto extends PartialType(CreateDynamodbLogDto) {}
