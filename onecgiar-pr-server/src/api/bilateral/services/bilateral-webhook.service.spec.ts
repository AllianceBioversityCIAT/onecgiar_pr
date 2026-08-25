import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookRecipientType } from '../../results/webhook/entities/webhook-endpoint.entity';
import { WebhookEndpointRepository } from '../../results/webhook/webhook-endpoint.repository';
import { ClarisaApiKeyValidationMis } from '../interfaces/clarisa-api-key-validation.interface';
import { BilateralWebhookService } from './bilateral-webhook.service';

/**
 * P2-3166 — registration of a platform's callback destination.
 *
 * The assertion that carries the whole feature is the first one: the recipient comes from the
 * authenticated `mis`, never from the request. Everything else guards the SSRF surface.
 */
describe('BilateralWebhookService', () => {
  let service: BilateralWebhookService;
  let repository: {
    upsertForRecipient: jest.Mock;
    findForRecipient: jest.Mock;
  };

  const mis: ClarisaApiKeyValidationMis = {
    id: 12,
    name: 'CGIAR Platform for Big Data in Agriculture',
    acronym: 'BIGDATA',
  };

  const stored = {
    id: 7,
    recipient_type: WebhookRecipientType.PLATFORM,
    recipient_id: 12,
    recipient_acronym: 'BIGDATA',
    url: 'https://platform.example.org/hook',
    secret: 'should-never-be-returned',
    is_active: true,
    last_updated_date: new Date('2026-08-25T12:00:00Z'),
  };

  beforeEach(async () => {
    repository = {
      upsertForRecipient: jest.fn().mockResolvedValue(stored),
      findForRecipient: jest.fn().mockResolvedValue(stored),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralWebhookService,
        { provide: WebhookEndpointRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<BilateralWebhookService>(BilateralWebhookService);
  });

  describe('register', () => {
    it('binds the destination to the authenticated platform, not to anything in the body', async () => {
      await service.register({ url: 'https://platform.example.org/hook' }, mis);

      expect(repository.upsertForRecipient).toHaveBeenCalledWith({
        recipientType: WebhookRecipientType.PLATFORM,
        recipientId: 12,
        recipientAcronym: 'BIGDATA',
        url: 'https://platform.example.org/hook',
      });
    });

    it('stores the URL normalised by URL rather than the raw string', async () => {
      await service.register({ url: '  https://platform.example.org  ' }, mis);

      const [args] = repository.upsertForRecipient.mock.calls[0];
      expect(args.url).toBe('https://platform.example.org/');
    });

    it('never returns the secret', async () => {
      const result = await service.register(
        { url: 'https://platform.example.org/hook' },
        mis,
      );

      expect(JSON.stringify(result)).not.toContain('should-never-be-returned');
      expect(result.response).not.toHaveProperty('secret');
    });

    it.each([
      ['plain http', 'http://platform.example.org/hook'],
      ['cloud metadata', 'https://169.254.169.254/latest/meta-data/'],
      ['loopback', 'https://127.0.0.1/hook'],
      ['private range', 'https://10.0.0.1/hook'],
    ])('rejects %s without writing anything', async (_label, url) => {
      await expect(service.register({ url }, mis)).rejects.toThrow(
        BadRequestException,
      );

      expect(repository.upsertForRecipient).not.toHaveBeenCalled();
    });

    // The guard makes this unreachable, but `@ExternalPlatform()` is typed optional. Failing loudly
    // beats writing a row against a null recipient.
    it.each([
      ['no platform', undefined],
      ['platform with no id', { name: 'x', acronym: 'X' } as any],
    ])('rejects %s as unauthorized', async (_label, platform) => {
      await expect(
        service.register(
          { url: 'https://platform.example.org/hook' },
          platform,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(repository.upsertForRecipient).not.toHaveBeenCalled();
    });

    it('tolerates a mis with no acronym', async () => {
      await service.register({ url: 'https://platform.example.org/hook' }, {
        id: 12,
        name: 'Some MIS',
      } as ClarisaApiKeyValidationMis);

      const [args] = repository.upsertForRecipient.mock.calls[0];
      expect(args.recipientAcronym).toBeNull();
    });
  });

  describe('find', () => {
    it('looks up the authenticated platform only', async () => {
      await service.find(mis);

      expect(repository.findForRecipient).toHaveBeenCalledWith(
        WebhookRecipientType.PLATFORM,
        12,
      );
    });

    it('never returns the secret', async () => {
      const result = await service.find(mis);

      expect(JSON.stringify(result)).not.toContain('should-never-be-returned');
    });

    // Not registered yet is a normal answer to "what do you have for me", not a 404.
    it('returns null rather than failing when nothing is registered', async () => {
      repository.findForRecipient.mockResolvedValue(null);

      const result = await service.find(mis);

      expect(result.response).toBeNull();
      expect(result.status).toBe(200);
      expect(result.message).toContain('No webhook endpoint');
    });

    it('rejects an unauthenticated caller', async () => {
      await expect(service.find(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
