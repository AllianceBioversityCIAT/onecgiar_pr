import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { WebhookRecipientType } from '../../results/webhook/entities/webhook-endpoint.entity';
import { WebhookEndpointRepository } from '../../results/webhook/webhook-endpoint.repository';
import { checkPublicHttpsUrl } from '../../../shared/utils/public-url.util';
import { BILATERAL_UNAUTHORIZED_MESSAGE } from '../constants/bilateral-auth.constants';
import { ClarisaApiKeyValidationMis } from '../interfaces/clarisa-api-key-validation.interface';
import { RegisterWebhookDto } from '../dto/register-webhook.dto';

/**
 * P2-3166 — self-service registration of a platform's callback destination.
 *
 * Nothing populated `webhook_endpoint` before this: the only way a platform could receive callbacks
 * was a manual INSERT. This closes that, without an admin UI and without asking anyone to run SQL.
 *
 * The security property is that **the recipient is never a parameter**. It is taken from the `mis`
 * CLARISA resolved from the API key, so a platform can only ever write its own row. The body
 * carries the URL and nothing else.
 */
@Injectable()
export class BilateralWebhookService {
  private readonly logger = new Logger(BilateralWebhookService.name);

  constructor(private readonly endpointRepository: WebhookEndpointRepository) {}

  async register(
    dto: RegisterWebhookDto,
    platform?: ClarisaApiKeyValidationMis,
  ) {
    const mis = this.requirePlatform(platform);

    const check = checkPublicHttpsUrl(dto.url);
    if (!check.ok) {
      throw new BadRequestException(check.reason);
    }

    const endpoint = await this.endpointRepository.upsertForRecipient({
      recipientType: WebhookRecipientType.PLATFORM,
      recipientId: mis.id,
      recipientAcronym: mis.acronym ?? null,
      url: check.url.toString(),
    });

    this.logger.log(
      `Webhook endpoint registered for platform ${mis.acronym ?? mis.id} (endpoint ${endpoint.id})`,
    );

    return {
      response: this.toResponse(endpoint),
      message: 'Webhook endpoint registered successfully.',
      status: 200,
    };
  }

  async find(platform?: ClarisaApiKeyValidationMis) {
    const mis = this.requirePlatform(platform);

    const endpoint = await this.endpointRepository.findForRecipient(
      WebhookRecipientType.PLATFORM,
      mis.id,
    );

    return {
      // Not registered yet is a normal state, not a 404 — the caller is asking "what do you have
      // for me", and "nothing" is a valid answer they can act on.
      response: endpoint ? this.toResponse(endpoint) : null,
      message: endpoint
        ? 'Webhook endpoint retrieved successfully.'
        : 'No webhook endpoint registered for this platform.',
      status: 200,
    };
  }

  /**
   * The guard should make this unreachable, but `@ExternalPlatform()` is typed optional because it
   * returns `undefined` off unguarded routes. Failing loudly beats writing a row against a null
   * recipient.
   */
  private requirePlatform(
    platform?: ClarisaApiKeyValidationMis,
  ): ClarisaApiKeyValidationMis {
    if (!platform?.id) {
      throw new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE);
    }
    return platform;
  }

  /** `secret` is never returned. It is unused today and it is not the caller's to read. */
  private toResponse(endpoint: {
    id: number;
    recipient_type: string;
    recipient_id: number;
    recipient_acronym: string | null;
    url: string;
    is_active: boolean;
    last_updated_date: Date;
  }) {
    return {
      id: endpoint.id,
      recipient_type: endpoint.recipient_type,
      recipient_id: endpoint.recipient_id,
      recipient_acronym: endpoint.recipient_acronym,
      url: endpoint.url,
      is_active: !!endpoint.is_active,
      last_updated_date: endpoint.last_updated_date,
    };
  }
}
