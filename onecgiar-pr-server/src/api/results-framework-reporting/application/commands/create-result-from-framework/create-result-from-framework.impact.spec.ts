import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ResultRepository } from '../../../../results/result.repository';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { CreateResultFromFrameworkHandler } from './create-result-from-framework.handler';
import { CreateResultFromFrameworkCommand } from './create-result-from-framework.command';
import { CreateFrameworkResultEntityService } from './create-framework-result-entity.service';
import { LinkFrameworkResultTocService } from './link-framework-result-toc.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';
import { IMPACT_AREA_TAG_COLUMN } from '../../../impact-level/constants/impact-area-tag-column';

/** IRS-R-1 / IRS-R-2 (IRS-T-4): impact branch of the framework create handler. */
describe('CreateResultFromFrameworkHandler — impact branch (IRS-R-1, IRS-R-2)', () => {
  const user = { id: 10 } as TokenDto;
  let handler: CreateResultFromFrameworkHandler;

  const entityService = { execute: jest.fn() };
  const linkService = { execute: jest.fn() };
  const associationsService = { execute: jest.fn() };
  const resultRepository = { getResultById: jest.fn(), update: jest.fn() };

  const impactPayload = (
    extra: Record<string, unknown> = {},
    ...areaArg: any[]
  ) =>
    ({
      result: {
        initiative_id: 15,
        result_level_id: 1,
        result_type_id: 9,
        result_name: 'Impact',
        // no argument -> area 4; an explicit `undefined` stays undefined
        impact_area_id: areaArg.length ? areaArg[0] : 4,
      },
      ...extra,
    }) as any;

  const run = (payload: any) =>
    handler.execute(new CreateResultFromFrameworkCommand(payload, user));

  const expectNothingWritten = () => {
    expect(entityService.execute).not.toHaveBeenCalled();
    expect(linkService.execute).not.toHaveBeenCalled();
    expect(associationsService.execute).not.toHaveBeenCalled();
    expect(resultRepository.update).not.toHaveBeenCalled();
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    entityService.execute.mockResolvedValue({
      createdResultId: 101,
      initiativeId: 15,
    });
    resultRepository.getResultById.mockResolvedValue({ id: 101 });
    linkService.execute.mockResolvedValue(900);
    associationsService.execute.mockResolvedValue(undefined);
    resultRepository.update.mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [
        CreateResultFromFrameworkHandler,
        {
          provide: CreateFrameworkResultEntityService,
          useValue: entityService,
        },
        { provide: LinkFrameworkResultTocService, useValue: linkService },
        {
          provide: ApplyFrameworkResultAssociationsService,
          useValue: associationsService,
        },
        { provide: ResultRepository, useValue: resultRepository },
      ],
    }).compile();
    handler = module.get(CreateResultFromFrameworkHandler);
  });

  describe('Scenario 1.1 — happy path', () => {
    it('creates the result without ToC/target fields and skips the ToC link', async () => {
      const payload = impactPayload();
      const out = await run(payload);

      expect(entityService.execute).toHaveBeenCalledWith(payload, user);
      expect(linkService.execute).not.toHaveBeenCalled();
      expect(associationsService.execute).toHaveBeenCalledWith(
        payload,
        user,
        101,
      );
      expect(out.status).toBe(HttpStatus.CREATED);
      expect(out.response.tocResultLinkId).toBeNull();
    });

    it.each([
      [1, 'nutrition_tag_level_id'],
      [2, 'poverty_tag_level_id'],
      [3, 'gender_tag_level_id'],
      [4, 'climate_change_tag_level_id'],
      [5, 'environmental_biodiversity_tag_level_id'],
    ])(
      'accepts area %i (and the constant maps it to %s)',
      async (area, column) => {
        expect(IMPACT_AREA_TAG_COLUMN[area]).toBe(column);
        await expect(run(impactPayload({}, area))).resolves.toBeDefined();
      },
    );

    it('accepts null/undefined for every ToC/target field', async () => {
      await expect(
        run(
          impactPayload({
            toc_result_id: null,
            indicators: undefined,
            number_target: null,
            target_date: null,
            contributing_indicator: undefined,
          }),
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('Scenario 1.2 — missing or invalid Impact Area', () => {
    it.each([undefined, null, 0, 6, -1, 2.5, '', 'abc', true, {}])(
      'rejects %p with 400 and writes nothing (falsifier b)',
      async (area) => {
        await expect(run(impactPayload({}, area))).rejects.toMatchObject({
          status: HttpStatus.BAD_REQUEST,
          message: 'Impact results require an Impact Area',
        });
        expectNothingWritten();
      },
    );

    it('accepts a numeric string id', async () => {
      await expect(run(impactPayload({}, '3'))).resolves.toBeDefined();
    });
  });

  describe('Scenario 1.3 — target or ToC data on an impact result', () => {
    it.each([
      ['toc_result_id', 555],
      ['indicators', [{ indicator_id: 1 }]],
      ['number_target', 5],
      ['number_target', 0],
      ['target_date', '2030-01-01'],
      ['contributing_indicator', 7],
    ])(
      'rejects non-null %s=%p with 400 and creates nothing (falsifier a)',
      async (field, value) => {
        await expect(
          run(impactPayload({ [field]: value })),
        ).rejects.toMatchObject({
          status: HttpStatus.BAD_REQUEST,
          message:
            'Impact results cannot have targets, indicators or Theory of Change',
          response: { forbidden_fields: [field] },
        });
        expectNothingWritten();
      },
    );

    it('rejects a non-empty contributors_result_toc_result (IRS-R-9 post-decision) and writes nothing', async () => {
      await expect(
        run(
          impactPayload({
            contributors_result_toc_result: [{ result_toc_result_id: 1 }],
          }),
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        message:
          'Impact results cannot have targets, indicators or Theory of Change',
        response: { forbidden_fields: ['contributors_result_toc_result'] },
      });
      expectNothingWritten();
    });

    it.each([[[]], [null], [undefined]])(
      'accepts an empty/null contributors_result_toc_result (%p)',
      async (value) => {
        await expect(
          run(impactPayload({ contributors_result_toc_result: value })),
        ).resolves.toBeDefined();
      },
    );
  });

  describe('Scenario 2.1 — prefill once, at creation', () => {
    it.each(Object.keys(IMPACT_AREA_TAG_COLUMN).map(Number))(
      'area %i: chosen column = 3, other four = 1',
      async (area) => {
        await run(impactPayload({}, area));

        const chosen = IMPACT_AREA_TAG_COLUMN[area];
        const expected = Object.fromEntries(
          Object.values(IMPACT_AREA_TAG_COLUMN).map((c) => [
            c,
            c === chosen ? 3 : 1,
          ]),
        );
        expect(resultRepository.update).toHaveBeenCalledTimes(1);
        expect(resultRepository.update).toHaveBeenCalledWith(101, {
          ...expected,
          last_updated_by: 10,
        });
      },
    );

    it('writes the prefill after the result is created (never before)', async () => {
      const order: string[] = [];
      entityService.execute.mockImplementationOnce(async () => {
        order.push('create');
        return { createdResultId: 101, initiativeId: 15 };
      });
      resultRepository.update.mockImplementationOnce(async () => {
        order.push('prefill');
      });
      await run(impactPayload());
      expect(order).toEqual(['create', 'prefill']);
    });

    it('writes the prefill exactly once per create (falsifier c, partial)', async () => {
      // Proves one write per create. The "later saves are not overwritten" guarantee comes from
      // createResultGeneralInformation being untouched, not from this test.
      await run(impactPayload());
      expect(resultRepository.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 1.4 — non-impact requests ignore impact_area_id (falsifier d)', () => {
    it.each([
      [2, 2],
      [1, 7],
      [3, 9],
    ])('level %i / type %i behaves as today', async (level, type) => {
      const payload = {
        result: {
          initiative_id: 15,
          result_level_id: level,
          result_type_id: type,
          result_name: 'X',
          impact_area_id: 99,
        },
        toc_result_id: 555,
        number_target: 5,
      } as any;

      const out = await run(payload);

      expect(entityService.execute).toHaveBeenCalledWith(payload, user);
      expect(linkService.execute).toHaveBeenCalledWith(payload, user, 101, 15);
      expect(associationsService.execute).toHaveBeenCalledWith(
        payload,
        user,
        101,
      );
      expect(resultRepository.update).not.toHaveBeenCalled();
      expect(out.response.tocResultLinkId).toBe(900);
    });
  });
});
