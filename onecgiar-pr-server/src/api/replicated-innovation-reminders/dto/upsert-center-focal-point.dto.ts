// @akili-spec changes/rir-center-focal-routing
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Trim and lower-case a string, leaving anything else for the validators to reject. */
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Trim a name; an empty or blank name means "no name" (stored as NULL). */
const normalizeName = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** `POST center-focal-points` body (design §6, `RCF-R-7`). */
export class CreateCenterFocalPointDto {
  @ApiProperty({ description: '`clarisa_center.code`.', example: 'CENTER-10' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  center_code: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(normalizeName)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string | null;

  @ApiProperty({ example: 'someone@cgiar.org' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(150)
  email: string;
}

/** `PATCH center-focal-points/:id` body: every field optional (design §6). */
export class UpdateCenterFocalPointDto {
  @ApiPropertyOptional({ nullable: true })
  @Transform(normalizeName)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string | null;

  @ApiPropertyOptional()
  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ description: 'false deactivates, true reactivates.' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
