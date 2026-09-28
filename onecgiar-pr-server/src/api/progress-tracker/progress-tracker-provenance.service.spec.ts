// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProgressTrackerProvenanceService } from './progress-tracker-provenance.service';
import { ProgressTrackerResultProvenance } from './entities/progress-tracker-result-provenance.entity';

/** `PTM-TEST-6` (service half) — `PTM-R-13`, `PTM-AC-12`; `PTM-T-6` column-width pointer. */
describe('ProgressTrackerProvenanceService', () => {
  let service: ProgressTrackerProvenanceService;
  const repo = {
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve({ id: 1, ...v })),
    find: jest.fn(),
  };

  const valid = {
    result_key: '8006329bfd49:1',
    evidence_fingerprint:
      'f9adbe6f47c1e67fba54eac88e3c7f50aefa75c6bf4b1bbe9359e586aa01a181',
    environment: 'staging',
    model: 'claude-haiku-4-5-20251001',
    generated_at: '2026-09-22T12:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProgressTrackerProvenanceService,
        {
          provide: getRepositoryToken(ProgressTrackerResultProvenance),
          useValue: repo,
        },
      ],
    }).compile();
    service = module.get(ProgressTrackerProvenanceService);
  });

  const rejects = async (block: unknown, property?: string) => {
    const err = await service.validate(block).then(
      () => null,
      (e) => e,
    );
    expect(err).toMatchObject({ status: HttpStatus.BAD_REQUEST });
    if (property) expect(err.message).toContain(property);
    return err;
  };

  describe('validate', () => {
    it('accepts the real staging shape (fixture lengths: 14 / 64 / 7 / 25)', async () => {
      await expect(service.validate(valid)).resolves.toMatchObject(valid);
    });

    it('accepts a block carrying only result_key', async () => {
      await expect(
        service.validate({ result_key: '8006329bfd49:2' }),
      ).resolves.toMatchObject({ result_key: '8006329bfd49:2' });
    });

    it.each([
      ['result_key', `${'a'.repeat(32)}:${'1'.repeat(32)}`, 64],
      ['evidence_fingerprint', 'f'.repeat(129), 128],
      ['model', 'm'.repeat(65), 64],
    ])(
      'rejects %s one character over its column width',
      async (field, value, width) => {
        expect(value.length).toBe(width + 1);
        await rejects({ ...valid, [field]: value }, field);
      },
    );

    it.each([
      ['result_key', `${'a'.repeat(32)}:${'1'.repeat(31)}`, 64],
      ['evidence_fingerprint', 'f'.repeat(128), 128],
      ['model', 'm'.repeat(64), 64],
    ])(
      'accepts %s at exactly its column width',
      async (field, value, width) => {
        expect(value.length).toBe(width);
        await expect(
          service.validate({ ...valid, [field]: value }),
        ).resolves.toBeDefined();
      },
    );

    it('rejects environment over 16 characters and outside dev|staging|prod', async () => {
      await rejects({ ...valid, environment: 's'.repeat(17) }, 'environment');
      await rejects({ ...valid, environment: 'local' }, 'environment');
    });

    it.each([
      ['no colon', '8006329bfd49'],
      ['non-numeric suffix', '8006329bfd49:x'],
      ['indicator part over 32', `${'a'.repeat(33)}:1`],
      ['empty indicator part', ':1'],
    ])('rejects a result_key with %s', async (_label, result_key) => {
      await rejects({ ...valid, result_key }, 'result_key');
    });

    it('rejects a missing result_key, including an empty object', async () => {
      await rejects({}, 'result_key');
    });

    it('rejects a non-ISO generated_at', async () => {
      await rejects({ ...valid, generated_at: 'yesterday' }, 'generated_at');
    });

    it('rejects unknown keys (closed shape) — e.g. a client sending pt_indicator_id', async () => {
      await rejects({ ...valid, pt_indicator_id: 'x' }, 'pt_indicator_id');
    });

    it.each([
      ['a string', 'x'],
      ['an array', [valid]],
      ['null', null],
    ])('rejects %s', async (_label, block) => {
      await rejects(block);
    });

    it('never echoes the offending value in the error message', async () => {
      const secretish = 'm'.repeat(60) + 'LEAK1';
      const err = await rejects({ ...valid, model: secretish }, 'model');
      expect(err.message).not.toContain('LEAK1');
    });
  });

  describe('write', () => {
    it('persists every field, derives pt_indicator_id from result_key, stamps the user', async () => {
      const dto = await service.validate(valid);

      await service.write(101, dto, 10);

      expect(repo.save).toHaveBeenCalledWith({
        result_id: 101,
        pt_result_key: '8006329bfd49:1',
        pt_evidence_fingerprint: valid.evidence_fingerprint,
        pt_indicator_id: '8006329bfd49',
        pt_environment: 'staging',
        pt_model: 'claude-haiku-4-5-20251001',
        pt_generated_at: new Date('2026-09-22T12:00:00.000Z'),
        created_by: 10,
        last_updated_by: 10,
      });
    });

    it('stores null for every optional field the block omits', async () => {
      await service.write(5, { result_key: 'abc:3' }, 7);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pt_result_key: 'abc:3',
          pt_indicator_id: 'abc',
          pt_evidence_fingerprint: null,
          pt_environment: null,
          pt_model: null,
          pt_generated_at: null,
        }),
      );
    });
  });

  describe('findByIndicator (PTM-AC-12 — retrievable by indicator, no free-text parsing)', () => {
    it('queries the denormalized pt_indicator_id column directly', async () => {
      repo.find.mockResolvedValueOnce([{ id: 1 }]);

      await expect(service.findByIndicator('8006329bfd49')).resolves.toEqual([
        { id: 1 },
      ]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { pt_indicator_id: '8006329bfd49', is_active: true },
      });
    });
  });
});
