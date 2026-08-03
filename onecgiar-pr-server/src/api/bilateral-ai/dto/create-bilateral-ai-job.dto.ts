import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBilateralAiJobDto {
  @IsInt()
  project_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  program_code: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  text?: string;
}
