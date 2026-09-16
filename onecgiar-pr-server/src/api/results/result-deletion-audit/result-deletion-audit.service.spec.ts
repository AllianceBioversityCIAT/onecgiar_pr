import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResultDeletionAudit } from './entities/result-deletion-audit.entity';
import { ResultDeletionAuditService } from './result-deletion-audit.service';
import { ResultDeletionAuditSource } from './result-deletion-audit-source.enum';

/**
 * `describeDeletion` is the sentence a reporter reads when their save fails because the result
 * was deleted under them. It runs on an error path, so the two things that matter are that it
 * says WHO and WHEN, and that it never makes the error worse.
 */
describe('ResultDeletionAuditService', () => {
  let service: ResultDeletionAuditService;
  let repository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  const auditRow = (overrides: Partial<ResultDeletionAudit> = {}) =>
    ({
      id: 53,
      result_id: 11856,
      deleted_by_user_id: 71,
      created_date: new Date('2026-09-16T14:57:40.000Z'),
      justification: null,
      deletion_source: ResultDeletionAuditSource.ManageData,
      obj_deleted_by: {
        first_name: 'Juan Carlos',
        last_name: 'Cadavid',
        email: 'j.cadavid@cgiar.org',
      },
      ...overrides,
    }) as unknown as ResultDeletionAudit;

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultDeletionAuditService,
        {
          provide: getRepositoryToken(ResultDeletionAudit),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(ResultDeletionAuditService);
  });

  it('states who deleted the result and when, in UTC', async () => {
    repository.findOne.mockResolvedValue(auditRow());

    const message = await service.describeDeletion(11856);

    expect(message).toBe(
      'This result was deleted on 16 Sep 2026, 14:57 UTC by Juan Carlos Cadavid (j.cadavid@cgiar.org). ' +
        'Nothing you entered was saved. Please contact them if it needs to be restored.',
    );
  });

  // The time zone is the half that is easy to get wrong: the column is UTC and the readers are
  // not, so an unlabelled hour would be wrong for most of them.
  it('labels the hour as UTC and does not shift it to the server time zone', async () => {
    repository.findOne.mockResolvedValue(
      auditRow({ created_date: new Date('2026-01-05T03:07:00.000Z') }),
    );

    await expect(service.describeDeletion(1)).resolves.toContain(
      '05 Jan 2026, 03:07 UTC',
    );
  });

  it('includes the justification when the deletion had one', async () => {
    repository.findOne.mockResolvedValue(
      auditRow({ justification: 'Duplicated during the smoke test' }),
    );

    await expect(service.describeDeletion(11856)).resolves.toContain(
      'Reason: "Duplicated during the smoke test".',
    );
  });

  // The user row can be gone. Half a sentence beats a fabricated name, and the "contact them"
  // half has to disappear with it — there is nobody to contact.
  it('drops the author when the user is no longer resolvable', async () => {
    repository.findOne.mockResolvedValue(auditRow({ obj_deleted_by: null }));

    const message = await service.describeDeletion(11856);

    expect(message).toBe(
      'This result was deleted on 16 Sep 2026, 14:57 UTC. Nothing you entered was saved.',
    );
    expect(message).not.toContain('contact');
  });

  it('returns null when nothing was ever deleted for that result', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.describeDeletion(42)).resolves.toBeNull();
  });

  // 🛑 The caller is already answering a 404. A failure here must not turn that into a 500.
  it('swallows a repository failure and returns null', async () => {
    repository.findOne.mockRejectedValue(new Error('ER_NO_SUCH_TABLE'));

    await expect(service.describeDeletion(11856)).resolves.toBeNull();
  });

  it('still records deletions the way it always did', async () => {
    await service.recordDeletion({
      resultId: 11856,
      userId: 71,
      deletionSource: ResultDeletionAuditSource.ManageData,
      justification: '   ',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: 11856,
        deleted_by_user_id: 71,
        justification: null,
        deletion_source: ResultDeletionAuditSource.ManageData,
      }),
    );
  });
});
