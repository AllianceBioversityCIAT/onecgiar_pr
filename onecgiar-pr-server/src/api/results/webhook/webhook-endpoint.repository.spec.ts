import { DataSource } from 'typeorm';
import { WebhookRecipientType } from './entities/webhook-endpoint.entity';
import { WebhookEndpointRepository } from './webhook-endpoint.repository';

/**
 * The upsert semantics are the contract here: one destination per recipient, and a URL change must
 * not disturb `secret` (unused today, but a future signing key must not be silently reset).
 */
describe('WebhookEndpointRepository', () => {
  let repository: WebhookEndpointRepository;
  let findOne: jest.Mock;
  let update: jest.Mock;
  let save: jest.Mock;
  let create: jest.Mock;
  let findOneOrFail: jest.Mock;

  beforeEach(() => {
    findOne = jest.fn();
    update = jest.fn().mockResolvedValue({ affected: 1 });
    save = jest.fn().mockImplementation((entity) => ({ id: 99, ...entity }));
    create = jest.fn().mockImplementation((entity) => entity);
    findOneOrFail = jest
      .fn()
      .mockResolvedValue({ id: 7, url: 'https://new.example.org/' });

    const dataSource = {
      createEntityManager: () => ({}),
    } as unknown as DataSource;

    repository = new WebhookEndpointRepository(dataSource);

    Object.assign(repository, { findOne, update, save, create, findOneOrFail });
  });

  describe('upsertForRecipient', () => {
    const params = {
      recipientType: WebhookRecipientType.PLATFORM,
      recipientId: 12,
      recipientAcronym: 'BIGDATA',
      url: 'https://new.example.org/',
    };

    it('inserts when the recipient has no endpoint yet', async () => {
      findOne.mockResolvedValue(null);

      await repository.upsertForRecipient(params);

      expect(save).toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      const [entity] = create.mock.calls[0];
      expect(entity).toEqual(
        expect.objectContaining({
          recipient_type: WebhookRecipientType.PLATFORM,
          recipient_id: 12,
          url: 'https://new.example.org/',
          is_active: true,
        }),
      );
    });

    it('updates in place when one exists — one destination per recipient', async () => {
      findOne.mockResolvedValue({ id: 7, url: 'https://old.example.org/' });

      await repository.upsertForRecipient(params);

      expect(save).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          url: 'https://new.example.org/',
        }),
      );
    });

    it('leaves the secret untouched on update', async () => {
      findOne.mockResolvedValue({ id: 7, secret: 'existing-key' });

      await repository.upsertForRecipient(params);

      const [, patch] = update.mock.calls[0];
      expect(patch).not.toHaveProperty('secret');
    });

    // Re-sending a URL is a request to receive callbacks; leaving it inactive would silently ignore it.
    it('reactivates a previously disabled endpoint', async () => {
      findOne.mockResolvedValue({ id: 7, is_active: false });

      await repository.upsertForRecipient(params);

      const [, patch] = update.mock.calls[0];
      expect(patch.is_active).toBe(true);
    });
  });

  describe('findForRecipient', () => {
    // Deliberately not filtered by is_active: registration needs to see a disabled row to revive it.
    it('does not filter on is_active', async () => {
      await repository.findForRecipient(WebhookRecipientType.PLATFORM, 12);

      expect(findOne).toHaveBeenCalledWith({
        where: {
          recipient_type: WebhookRecipientType.PLATFORM,
          recipient_id: 12,
        },
      });
    });
  });
});
