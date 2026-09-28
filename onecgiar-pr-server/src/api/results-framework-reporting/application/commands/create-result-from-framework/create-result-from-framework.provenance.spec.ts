// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResultRepository } from '../../../../results/result.repository';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { CreateResultFromFrameworkHandler } from './create-result-from-framework.handler';
import { CreateResultFromFrameworkCommand } from './create-result-from-framework.command';
import { CreateFrameworkResultEntityService } from './create-framework-result-entity.service';
import { LinkFrameworkResultTocService } from './link-framework-result-toc.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';
import { ProgressTrackerProvenanceService } from '../../../../progress-tracker/progress-tracker-provenance.service';
import { ProgressTrackerModule } from '../../../../progress-tracker/progress-tracker.module';
import { ResultsFrameworkReportingModule } from '../../../results-framework-reporting.module';

/**
 * `PTM-TEST-6` — `PTM-AC-12` / `PTM-AC-13` at the handler hook (`PTM-T-7`).
 * The pre-existing `create-result-from-framework.handler.spec.ts` is deliberately left
 * untouched: it is the `PTM-AC-13` "existing suite passes unchanged" gate.
 */
describe('CreateResultFromFrameworkHandler — Progress Tracker provenance', () => {
  const calls: string[] = [];
  const track =
    (name: string, value?: unknown) =>
    (...args: unknown[]) => {
      calls.push(name);
      return Promise.resolve(
        typeof value === 'function' ? value(...args) : value,
      );
    };

  const mockCreateFrameworkResultEntityService = { execute: jest.fn() };
  const mockLinkFrameworkResultTocService = { execute: jest.fn() };
  const mockApplyFrameworkResultAssociationsService = { execute: jest.fn() };
  const mockResultRepository = { getResultById: jest.fn() };
  const mockProvenanceService = { validate: jest.fn(), write: jest.fn() };

  const user = { id: 10 } as TokenDto;
  const provenance = {
    result_key: '8006329bfd49:1',
    evidence_fingerprint: 'f9adbe6f47c1e67f',
    environment: 'staging',
    model: 'claude-haiku-4-5-20251001',
    generated_at: '2026-09-22T12:00:00Z',
  };
  const basePayload = () => ({
    result: { initiative_id: 15, result_type_id: 2, result_name: 'R' },
    toc_result_id: 555,
  });

  const build = async (withProvenanceService = true) => {
    const providers: any[] = [
      CreateResultFromFrameworkHandler,
      {
        provide: CreateFrameworkResultEntityService,
        useValue: mockCreateFrameworkResultEntityService,
      },
      {
        provide: LinkFrameworkResultTocService,
        useValue: mockLinkFrameworkResultTocService,
      },
      {
        provide: ApplyFrameworkResultAssociationsService,
        useValue: mockApplyFrameworkResultAssociationsService,
      },
      { provide: ResultRepository, useValue: mockResultRepository },
    ];
    if (withProvenanceService) {
      providers.push({
        provide: ProgressTrackerProvenanceService,
        useValue: mockProvenanceService,
      });
    }
    const module: TestingModule = await Test.createTestingModule({
      providers,
    }).compile();
    return module.get(CreateResultFromFrameworkHandler);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    mockCreateFrameworkResultEntityService.execute.mockImplementation(
      track('create', { createdResultId: 101, initiativeId: 15 }),
    );
    mockResultRepository.getResultById.mockImplementation(
      track('getResult', { id: 101 }),
    );
    mockLinkFrameworkResultTocService.execute.mockImplementation(
      track('link', 900),
    );
    mockApplyFrameworkResultAssociationsService.execute.mockImplementation(
      track('associations'),
    );
    mockProvenanceService.validate.mockImplementation(
      track('validate', (block: unknown) => block),
    );
    mockProvenanceService.write.mockImplementation(track('write', {}));
  });

  describe('PTM-AC-12 — create carrying a provenance block', () => {
    it('validates before creating and writes the row after associations, before returning', async () => {
      const handler = await build();
      const payload = {
        ...basePayload(),
        progress_tracker_provenance: provenance,
      };

      const result = await handler.execute(
        new CreateResultFromFrameworkCommand(payload as any, user),
      );

      expect(mockProvenanceService.validate).toHaveBeenCalledWith(provenance);
      expect(mockProvenanceService.write).toHaveBeenCalledWith(
        101,
        provenance,
        10,
      );
      expect(calls).toEqual([
        'validate',
        'create',
        'getResult',
        'link',
        'associations',
        'write',
      ]);
      expect(result.status).toBe(HttpStatus.CREATED);
    });

    it('writes the validated DTO, not the raw payload block', async () => {
      const handler = await build();
      const validated = { result_key: '8006329bfd49:1' };
      mockProvenanceService.validate.mockResolvedValueOnce(validated);

      await handler.execute(
        new CreateResultFromFrameworkCommand(
          { ...basePayload(), progress_tracker_provenance: provenance } as any,
          user,
        ),
      );

      expect(mockProvenanceService.write).toHaveBeenCalledWith(
        101,
        validated,
        10,
      );
    });

    it('creates nothing when the block fails validation', async () => {
      const handler = await build();
      mockProvenanceService.validate.mockRejectedValueOnce(
        Object.assign(
          new Error('Invalid progress_tracker_provenance: model.'),
          {
            status: HttpStatus.BAD_REQUEST,
          },
        ),
      );

      await expect(
        handler.execute(
          new CreateResultFromFrameworkCommand(
            {
              ...basePayload(),
              progress_tracker_provenance: provenance,
            } as any,
            user,
          ),
        ),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });

      expect(
        mockCreateFrameworkResultEntityService.execute,
      ).not.toHaveBeenCalled();
      expect(mockProvenanceService.write).not.toHaveBeenCalled();
    });

    it('does not write provenance for a result whose associations failed (Disqualifier)', async () => {
      const handler = await build();
      mockApplyFrameworkResultAssociationsService.execute.mockRejectedValueOnce(
        new Error('associations failed'),
      );

      await expect(
        handler.execute(
          new CreateResultFromFrameworkCommand(
            {
              ...basePayload(),
              progress_tracker_provenance: provenance,
            } as any,
            user,
          ),
        ),
      ).rejects.toThrow('associations failed');

      expect(mockProvenanceService.write).not.toHaveBeenCalled();
    });

    it('fails with 500 before creating anything when the provenance service is not wired', async () => {
      const handler = await build(false);

      await expect(
        handler.execute(
          new CreateResultFromFrameworkCommand(
            {
              ...basePayload(),
              progress_tracker_provenance: provenance,
            } as any,
            user,
          ),
        ),
      ).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });

      expect(
        mockCreateFrameworkResultEntityService.execute,
      ).not.toHaveBeenCalled();
    });
    it('sends an empty-string block to validation instead of treating it as absent', async () => {
      const handler = await build();
      mockProvenanceService.validate.mockRejectedValueOnce(
        Object.assign(new Error('bad'), { status: HttpStatus.BAD_REQUEST }),
      );

      await expect(
        handler.execute(
          new CreateResultFromFrameworkCommand(
            { ...basePayload(), progress_tracker_provenance: '' } as any,
            user,
          ),
        ),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });

      expect(mockProvenanceService.validate).toHaveBeenCalledWith('');
      expect(
        mockCreateFrameworkResultEntityService.execute,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PTM-AC-13 — create carrying no provenance block', () => {
    it('never touches the provenance service and returns the same response', async () => {
      const handler = await build();
      const payload = basePayload();
      // The falsifier fixture must omit the key entirely — not `{}`, not `null`.
      expect('progress_tracker_provenance' in payload).toBe(false);

      const result = await handler.execute(
        new CreateResultFromFrameworkCommand(payload as any, user),
      );

      expect(mockProvenanceService.validate).not.toHaveBeenCalled();
      expect(mockProvenanceService.write).not.toHaveBeenCalled();
      expect(calls).toEqual(['create', 'getResult', 'link', 'associations']);
      expect(result).toEqual({
        response: {
          result: { id: 101 },
          knowledgeProduct: null,
          tocResultLinkId: 900,
        },
        message: 'Result created successfully through the reporting workflow.',
        status: HttpStatus.CREATED,
      });
    });

    it('treats an explicit null block as absent (serializer-friendly reading of PTM-R-14)', async () => {
      const handler = await build();

      const result = await handler.execute(
        new CreateResultFromFrameworkCommand(
          { ...basePayload(), progress_tracker_provenance: null } as any,
          user,
        ),
      );

      expect(mockProvenanceService.validate).not.toHaveBeenCalled();
      expect(mockProvenanceService.write).not.toHaveBeenCalled();
      expect(result.status).toBe(HttpStatus.CREATED);
    });

    it('still succeeds when the provenance service is not wired at all', async () => {
      const handler = await build(false);

      const result = await handler.execute(
        new CreateResultFromFrameworkCommand(basePayload() as any, user),
      );

      expect(result.status).toBe(HttpStatus.CREATED);
    });
  });

  it('ResultsFrameworkReportingModule imports ProgressTrackerModule, so @Optional() resolves in production', () => {
    const imports =
      Reflect.getMetadata('imports', ResultsFrameworkReportingModule) ?? [];
    expect(imports).toContain(ProgressTrackerModule);
  });
});
