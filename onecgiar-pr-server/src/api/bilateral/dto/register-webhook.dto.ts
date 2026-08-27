import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body for `POST /api/bilateral/webhook` (P2-3166).
 *
 * The URL is the only thing the caller supplies. **The recipient is not a field**: it comes from
 * the API key via `@ExternalPlatform()`, which is what stops a platform from registering someone
 * else's callback.
 *
 * Validation here is deliberately shallow — `@IsString` only. The real check is
 * `checkPublicHttpsUrl`, applied in the service, because rejecting an SSRF-shaped URL needs a
 * reason the caller can act on, and a `class-validator` message cannot explain *why* a host was
 * refused.
 */
export class RegisterWebhookDto {
  @ApiProperty({
    description:
      'HTTPS URL that PRMS will POST to when a Science Program approves or rejects one of your results. Must be publicly reachable.',
    example: 'https://your-platform.example.org/prms/callback',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  url: string;
}
