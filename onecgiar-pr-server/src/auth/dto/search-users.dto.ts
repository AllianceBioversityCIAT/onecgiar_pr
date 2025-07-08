import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchUsersDto {
  @ApiProperty({
    description: 'Search query for users',
    example: 'john.doe',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: 'Query must be at least 2 characters long' })
  query: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Whether to use cache for the search',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  useCache?: boolean = true;
}
