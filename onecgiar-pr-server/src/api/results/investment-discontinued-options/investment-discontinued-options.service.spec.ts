import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { InvestmentDiscontinuedOptionsService } from './investment-discontinued-options.service';
import { InvestmentDiscontinuedOptionRepository } from './investment-discontinued-options.repository';
import { ReturnResponse } from '../../../shared/handlers/error.utils';

/**
 * P2-3292 Step 2 — the discontinuation reason catalogue is served ONE generation
 * at a time.
 *
 * The catalogue has no phase column beyond `phase_year_from`, which marks the phase
 * a reason was introduced for. The six original rows carry `NULL`. Serving the
 * union of both sets would put thirteen reasons in one checklist; serving the wrong
 * one would make a 2025-phase result lose a reason it had already reported, which is
 * the failure epic P2-3243 forbids.
 */
describe('InvestmentDiscontinuedOptionsService — phase generations', () => {
  let service: InvestmentDiscontinuedOptionsService;
  let repo: { find: jest.Mock };

  const LEGACY = [
    'No or limited progress in improving the readiness of the innovation.',
    'The innovation lead and/or team took up new responsibilities.',
    'Limited Initiative resource availability required deprioritization of the innovation.',
    'Limited bilateral co-investment required deprioritization of the innovation.',
    'Absence of strong demand and scaling partners for the innovation.',
    'Other',
  ];

  const OPTIONS_2026 = [
    'Discontinued: limited design / testing / validation progress',
    'Discontinued: innovation lead / team took on new responsibilities',
    'Discontinued: limited W1/W2 resource availability',
    'Discontinued: limited bilateral co-investment',
    'Discontinued: merging with another innovation',
    'Discontinued: splitting into multiple innovations',
    'Other (please specify)',
  ];

  /** What the repository returns once the migration has run: both generations. */
  const wireCatalogue = () => {
    const rows = [
      ...LEGACY.map((option, i) => ({
        investment_discontinued_option_id: 1 + i,
        option,
        order: 0,
        result_type_id: 7,
        is_active: true,
        phase_year_from: null,
        requires_description: null,
      })),
      ...OPTIONS_2026.map((option, i) => ({
        investment_discontinued_option_id: 40 + i,
        option,
        order: i + 1,
        result_type_id: 7,
        is_active: true,
        phase_year_from: 2026,
        requires_description: option.startsWith('Other'),
      })),
    ];
    repo.find.mockResolvedValue(rows);
    return rows;
  };

  const served = async (resultTypeId: number, phaseYear?: number) => {
    const res: any = await service.findAll(resultTypeId, phaseYear);
    return (res.response as any[]).map((r) => r.option);
  };

  beforeEach(async () => {
    repo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentDiscontinuedOptionsService,
        {
          provide: ReturnResponse,
          useValue: {
            format: (payload: any) => payload,
          },
        },
        { provide: InvestmentDiscontinuedOptionRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(InvestmentDiscontinuedOptionsService);
  });

  it('serves the seven 2026 reasons to a 2026-phase result', async () => {
    wireCatalogue();

    expect(await served(7, 2026)).toEqual(OPTIONS_2026);
  });

  it('serves the six original reasons to a 2025-phase result', async () => {
    wireCatalogue();

    expect(await served(7, 2025)).toEqual(LEGACY);
  });

  it('never mixes the two generations in one checklist', async () => {
    wireCatalogue();

    for (const year of [2023, 2024, 2025, 2026, 2027, 2030]) {
      const options = await served(7, year);
      const fromLegacy = options.filter((o) => LEGACY.includes(o)).length;
      const from2026 = options.filter((o) => OPTIONS_2026.includes(o)).length;
      expect(Math.min(fromLegacy, from2026)).toBe(0);
    }
  });

  it('keeps serving the 2026 set to later phases', async () => {
    wireCatalogue();

    expect(await served(7, 2031)).toEqual(OPTIONS_2026);
  });

  it('answers the base generation when no phase year is given', async () => {
    // The pre-P2-3292 contract. IPSR and anything else that does not know about
    // phases must keep getting exactly what it got before.
    wireCatalogue();

    expect(await served(7)).toEqual(LEGACY);
  });

  it('answers the base generation when the phase year is not a number', async () => {
    wireCatalogue();

    expect(await served(7, Number.NaN)).toEqual(LEGACY);
  });

  it('maps Innovation Use (2) onto the Innovation Development catalogue', async () => {
    wireCatalogue();

    await served(2, 2026);

    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ result_type_id: 7 }),
      }),
    );
  });

  it('marks only the 2026 "Other" row as needing its free-text box', async () => {
    wireCatalogue();

    const res: any = await service.findAll(7, 2026);
    const flagged = (res.response as any[]).filter(
      (r) => r.requires_description,
    );

    expect(flagged.map((r) => r.option)).toEqual(['Other (please specify)']);
  });

  it('answers the base generation on a catalogue that has no 2026 rows yet', async () => {
    // The state before the migration inserts them: nothing may disappear.
    repo.find.mockResolvedValue(
      LEGACY.map((option, i) => ({
        investment_discontinued_option_id: 1 + i,
        option,
        phase_year_from: null,
      })),
    );

    expect(await served(7, 2026)).toEqual(LEGACY);
  });

  it('returns 200 with the served generation', async () => {
    wireCatalogue();

    const res: any = await service.findAll(7, 2026);

    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(res.response).toHaveLength(7);
  });
});
