import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { DecodedUser } from '../../shared/decorators/user-token.decorator';
import { BilateralClarisaEndpoint } from './decorators/bilateral-clarisa-endpoint.decorator';
import { ExternalPlatform } from './decorators/external-platform.decorator';
import { ClarisaApiKeyGuard } from './guards/clarisa-api-key.guard';
import { VerifiedSessionGuard } from './guards/verified-session.guard';
import { ClarisaApiKeyValidationMis } from './interfaces/clarisa-api-key-validation.interface';
import { HandoffStartDto } from './dto/handoff-start.dto';
import { HandoffExchangeDto } from './dto/handoff-exchange.dto';
import {
  BilateralHandoffService,
  HandoffSessionUser,
} from './services/bilateral-handoff.service';

/**
 * `start` / `exchange` — sign-in handoff from PRMS to the Bulk Results Uploader.
 *
 * `@Controller()` is bare (no path prefix) and each route carries its own full path,
 * following `BilateralWebhookController`'s pattern, because the two routes sit under
 * different auth postures and neither belongs under a shared segment: `start` is
 * `center/handoff` (session-authenticated, mirrors `BilateralCenterController`'s
 * `center/*` routes) and `exchange` is `handoff/exchange` (CLARISA-key-authenticated,
 * partner-facing). Registered before `BilateralCenterController` in
 * `BilateralModule.controllers` — see that file's comment for why.
 *
 * @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-5, requirements.md §6
 * R-1, R-5, R-6, R-8, R-12 prerequisite; design.md §12 DD-1)
 */
@Controller()
@ApiTags('Bilateral handoff')
@UseInterceptors(ResponseInterceptor)
export class BilateralHandoffController {
  constructor(private readonly handoffService: BilateralHandoffService) {}

  @Post('center/handoff')
  @UseGuards(VerifiedSessionGuard)
  @ApiHeader({
    name: 'auth',
    required: true,
    description:
      'PRMS session JWT, verified by signature (never the unverified-decode fallback).',
  })
  @ApiOperation({
    summary:
      'Mint a one-time sign-in handoff code for the Bulk Results Uploader',
    description:
      'Requires a session verified by signature (`VerifiedSessionGuard`) and an active ' +
      'Center User role — or admin — on the requested centre. Mints a 32-byte, base64url, ' +
      '120-second, single-use code and returns it together with the partner redirect URL. ' +
      'Never returns claim data (no e-mail, no centre name, no role).',
  })
  @ApiResponse({
    status: 200,
    description: '{ code, expires_in: 120, redirect_url }',
  })
  @ApiResponse({ status: 401, description: 'No verified session.' })
  @ApiResponse({
    status: 403,
    description: 'Verified session has no role on the requested centre.',
  })
  @ApiResponse({ status: 400, description: 'Unsupported audience.' })
  @ApiResponse({
    status: 503,
    description: 'The handoff is not configured for this environment.',
  })
  async start(
    @DecodedUser() user: HandoffSessionUser,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: HandoffStartDto,
  ) {
    // `BilateralHandoffService.start` (T-4, closed) returns the raw
    // `{ code, expires_in, redirect_url }` shape, unlike this module's other services,
    // which wrap their own return in `{ response }` before the controller sees it — see
    // `bilateral-center.service.ts`. Wrapped here, at the envelope's home, rather than in
    // the closed service (Not Done / Assumptions in the Implementer report).
    const result = await this.handoffService.start(user, dto);
    return { response: result };
  }

  @Post('handoff/exchange')
  @UseGuards(ClarisaApiKeyGuard)
  @BilateralClarisaEndpoint('/api/bilateral/handoff/exchange')
  @ApiHeader({
    name: 'x-api-key',
    required: true,
    description: 'CLARISA API key for the calling platform.',
  })
  @ApiOperation({
    summary: 'Redeem a handoff code for PRMS-verified sign-in claims',
    description:
      'Partner-facing, CLARISA-API-key-authenticated. Redemption is single-use and atomic: ' +
      'unknown, expired, already-consumed and wrong-audience codes all answer the identical ' +
      '`400` body (R-8) so the response never reveals which condition applied.',
  })
  @ApiResponse({
    status: 200,
    description: 'Claims payload per partner contract v0.3 §4.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid x-api-key.' })
  @ApiResponse({
    status: 400,
    description: 'Unknown, expired, already-consumed or wrong-audience code.',
  })
  @ApiResponse({
    status: 503,
    description: 'CLARISA unavailable (retry-after: 30).',
  })
  async exchange(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        // R-8: a DTO validation failure on `exchange` must be indistinguishable from a
        // service-level miss — same status, same body, no hint about which check failed.
        exceptionFactory: () =>
          new BadRequestException('Invalid or expired code'),
      }),
    )
    dto: HandoffExchangeDto,
    @ExternalPlatform() platform?: ClarisaApiKeyValidationMis,
  ) {
    // Same wrapping note as `start` above — `exchange` also returns its claims unwrapped.
    const claims = await this.handoffService.exchange(dto, platform);
    return { response: claims };
  }
}
