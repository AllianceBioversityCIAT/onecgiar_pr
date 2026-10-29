import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ResultRepository } from '../../../../results/result.repository';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { CreateResultFromFrameworkHandler } from './create-result-from-framework.handler';
import { CreateResultFromFrameworkCommand } from './create-result-from-framework.command';
import { CreateFrameworkResultEntityService } from './create-framework-result-entity.service';
import { LinkFrameworkResultTocService } from './link-framework-result-toc.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';
import { ProgressTrackerProvenanceService } from '../../../../progress-tracker/progress-tracker-provenance.service';
import { ProgressTrackerPrefillService } from '../../../../progress-tracker/progress-tracker-prefill.service';

/** `PTB-R-18a` — the prefill step at the create handler: after provenance, never failing the create. */
describe('CreateResultFromFrameworkHandler — Progress Tracker prefill (PTB-R-18a)', () => {
  const calls: string[] = [];
  const user = { id: 10 } as TokenDto;
  const provenance = { result_key: '8006329bfd49:1' };
  const prefill = {
    evidence_links: [{ url: 'https://a.org/x', title: 'X' }],
    partners: [{ clarisa_id: 7, name: 'Org' }],
  };
  const summary = {
    evidence_links_saved: 1,
    partners_saved: 1,
    partners_skipped: [],
  };

  const mockPrefillService = { apply: jest.fn() };
  const mockProvenanceService = {
    validate: jest.fn(async (b) => b),
    write: jest.fn(async () => calls.push('write')),
  };

  const build = async (withPrefill = true) => {
    const providers: any[] = [
      CreateResultFromFrameworkHandler,
      {
        provide: CreateFrameworkResultEntityService,
        useValue: {
          execute: jest.fn(async () => ({
            createdResultId: 101,
            initiativeId: 15,
          })),
        },
      },
      {
        provide: LinkFrameworkResultTocService,
        useValue: { execute: jest.fn(async () => 900) },
      },
      {
        provide: ApplyFrameworkResultAssociationsService,
        useValue: { execute: jest.fn(async () => calls.push('associations')) },
      },
      {
        provide: ResultRepository,
        useValue: { getResultById: jest.fn(async () => ({ id: 101 })) },
      },
      {
        provide: ProgressTrackerProvenanceService,
        useValue: mockProvenanceService,
      },
    ];
    if (withPrefill) {
      providers.push({
        provide: ProgressTrackerPrefillService,
        useValue: mockPrefillService,
      });
    }
    const module = await Test.createTestingModule({ providers }).compile();
    return module.get(CreateResultFromFrameworkHandler);
  };

  const payload = (extra: Record<string, unknown> = {}) => ({
    result: { initiative_id: 15, result_type_id: 7, result_name: 'R' },
    toc_result_id: 555,
    ...extra,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    mockPrefillService.apply.mockImplementation(async () => {
      calls.push('prefill');
      return summary;
    });
  });

  it('applies the block after the provenance write and returns its summary', async () => {
    const handler = await build();
    const result = await handler.execute(
      new CreateResultFromFrameworkCommand(
        payload({
          progress_tracker_provenance: provenance,
          progress_tracker_prefill: prefill,
        }) as any,
        user,
      ),
    );

    expect(calls).toEqual(['associations', 'write', 'prefill']);
    expect(mockPrefillService.apply).toHaveBeenCalledWith(
      101,
      prefill,
      10,
      false,
    );
    expect(result.response).toMatchObject({ progressTrackerPrefill: summary });
    expect(result.status).toBe(HttpStatus.CREATED);
  });

  it('flags a knowledge product so partners use the KP contributor role', async () => {
    const handler = await build();
    await handler.execute(
      new CreateResultFromFrameworkCommand(
        payload({
          result: { initiative_id: 15, result_type_id: 6, result_name: 'R' },
          progress_tracker_provenance: provenance,
          progress_tracker_prefill: prefill,
        }) as any,
        user,
      ),
    );
    expect(mockPrefillService.apply).toHaveBeenCalledWith(
      101,
      prefill,
      10,
      true,
    );
  });

  it('ignores a prefill block that arrives without provenance', async () => {
    const handler = await build();
    const result = await handler.execute(
      new CreateResultFromFrameworkCommand(
        payload({ progress_tracker_prefill: prefill }) as any,
        user,
      ),
    );
    expect(mockPrefillService.apply).not.toHaveBeenCalled();
    expect(result.response).not.toHaveProperty('progressTrackerPrefill');
  });

  it('still creates when the prefill service is not wired', async () => {
    const handler = await build(false);
    const result = await handler.execute(
      new CreateResultFromFrameworkCommand(
        payload({
          progress_tracker_provenance: provenance,
          progress_tracker_prefill: prefill,
        }) as any,
        user,
      ),
    );
    expect(result.status).toBe(HttpStatus.CREATED);
    expect(result.response).not.toHaveProperty('progressTrackerPrefill');
  });
});
