import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBilateralGeneralInfoDto {
  @ApiProperty({
    description: 'Updated title',
    required: false,
    example: 'Updated result title',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Updated description',
    required: false,
    example: 'Updated description text',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
