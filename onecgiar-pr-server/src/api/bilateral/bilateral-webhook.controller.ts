import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { BilateralClarisaEndpoint } from './decorators/bilateral-clarisa-endpoint.decorator';
import { ExternalPlatform } from './decorators/external-platform.decorator';
import { ClarisaApiKeyGuard } from './guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationMis } from './interfaces/clarisa-api-key-validation.interface';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { BilateralWebhookService } from './services/bilateral-webhook.service';

/**
 * P2-3166 — where an external platform tells us how to call it back.
 *
 * Same posture as `BilateralController`: JWT-excluded, throttler-excluded, authenticated by the
 * CLARISA API key. The key is not just authentication here — it *is* the identity being registered
 * against, which is why the body carries no recipient field.
 */
@Controller()
@ApiTags('Bilaterals')
@ApiHeader({
  name: 'X-API-Key',
  required: true,
  description: 'CLARISA API key for bilateral access',
})
@UseGuards(ClarisaApiKeyGuard)
@SkipThrottle()
@UseInterceptors(ResponseInterceptor)
export class BilateralWebhookController {
  constructor(private readonly webhookService: BilateralWebhookService) {}

  @Post('webhook')
  @BilateralClarisaEndpoint('/api/bilateral/webhook')
  @ApiOperation({
    summary: 'Register or update this platform’s webhook destination',
    description:
      'PRMS POSTs to this URL when a Science Program approves or rejects one of your results. ' +
      'The destination is bound to the platform that owns the API key — there is no recipient ' +
      'field, and one platform cannot register another’s callback. Calling this again replaces ' +
      'the URL. Registering is not a prerequisite for submitting results: what matters is that a ' +
      'destination exists before a Science Program decides on them, since a decision taken with no ' +
      'destination registered is not delivered later.',
  })
  @ApiBody({ type: RegisterWebhookDto })
  @ApiOkResponse({
    description:
      'The registered destination. The signing secret, if one is ever configured, is never returned.',
  })
  async register(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    body: RegisterWebhookDto,
    @ExternalPlatform() platform?: ClarisaApiKeyValidationMis,
  ) {
    return this.webhookService.register(body, platform);
  }

  @Get('webhook')
  @BilateralClarisaEndpoint('/api/bilateral/webhook')
  @ApiOperation({
    summary: 'Retrieve this platform’s webhook destination',
    description:
      'Returns the destination registered for the platform that owns the API key, or null when ' +
      'none has been registered yet.',
  })
  @ApiOkResponse({ description: 'The registered destination, or null.' })
  async find(@ExternalPlatform() platform?: ClarisaApiKeyValidationMis) {
    return this.webhookService.find(platform);
  }
}
