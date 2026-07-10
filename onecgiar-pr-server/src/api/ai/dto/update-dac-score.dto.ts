import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { DacFieldName } from '../constants/dac-field-name.enum';

export class UpdateDacScoreDto {
  @ApiProperty({
    description: 'DAC dimension to update',
    enum: DacFieldName,
    example: DacFieldName.GENDER,
  })
  @IsEnum(DacFieldName)
  field_name: DacFieldName;

  @ApiProperty({
    description: 'Selected tag value',
    type: Number,
    nullable: true,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  tag_id?: number | null;

  @ApiProperty({
    description: 'Selected impact area (required when tag_id equals 3)',
    type: Number,
    nullable: true,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  impact_area_id?: number | null;

  @ApiProperty({
    description:
      'Optional AI session id to associate proposal tracking with this update',
    required: false,
    nullable: true,
    type: Number,
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  session_id?: number | null;

  @ApiProperty({
    description: 'Optional reason to display in AI revision logs',
    example: 'Updated after AI review feedback',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  change_reason?: string | null;
}
