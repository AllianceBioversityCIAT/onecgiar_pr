import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MaxLength } from 'class-validator';

/**
 * Body for `POST /api/bilateral/handoff/exchange` (`design.md` §4.1, `BIL-HO-T-5`).
 *
 * R-8 note: a validation failure here (extra property, wrong length, bad shape) MUST answer
 * the same `400` body as a service-level miss — enforced at the route by the `exchange`
 * route's own `ValidationPipe` `exceptionFactory` (`bilateral-handoff.controller.ts`), not
 * here. This class only declares the shape.
 *
 * @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-5, requirements.md §6 R-8, R-9)
 */
export class HandoffExchangeDto {
  @ApiProperty({
    description: '43-character base64url handoff code minted by `start`.',
    example: 'Uu0f6y8s6y8s6y8s6y8s6y8s6y8s6y8s6y8s6y8s6y8',
    minLength: 43,
    maxLength: 43,
  })
  @IsString()
  @Length(43, 43)
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'code must be 43 base64url characters',
  })
  code: string;

  @ApiProperty({
    description: 'Audience the code was minted for.',
    example: 'w3-bilateral-uploader:test',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9:_.-]+$/, {
    message: 'audience contains unsupported characters',
  })
  audience: string;
}
