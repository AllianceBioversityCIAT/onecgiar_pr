// @akili-spec quality-assurance/qa-results-feed
import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { QaResultsQueryDto } from './qa-results-query.dto';
import {
  QA_RESULTS_PAGE_MAX,
  QA_RESULTS_PAGE_SIZE_MAX,
  QA_RESULTS_PROGRAM_ID_MAX,
} from '../qa-results.constants';

// Same pipe options the controller uses, so the spec exercises the runtime path.
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: false,
});
const parse = (query: Record<string, unknown>): Promise<QaResultsQueryDto> =>
  pipe.transform(query, {
    type: 'query',
    metatype: QaResultsQueryDto,
  }) as Promise<QaResultsQueryDto>;

describe('QaResultsQueryDto (QRF-R-2 / R-4 / R-5)', () => {
  describe('phase_year', () => {
    it('missing -> 400, never defaulted from the clock (scenario: Year omitted)', async () => {
      await expect(parse({})).rejects.toBeInstanceOf(BadRequestException);
    });
    it.each(['abc', '', '2026.5', '-1', '20x6', '0', '1999', '2101'])(
      'phase_year=%p -> 400',
      async (value) => {
        await expect(parse({ phase_year: value })).rejects.toBeInstanceOf(
          BadRequestException,
        );
      },
    );
    it('a numeric string is converted to a number', async () => {
      expect((await parse({ phase_year: '2026' })).phase_year).toBe(2026);
    });
  });

  describe('paging defaults and bounds', () => {
    it('page defaults to 1 and page_size to 100', async () => {
      const dto = await parse({ phase_year: '2026' });
      expect(dto.page).toBe(1);
      expect(dto.page_size).toBe(100);
    });
    it('accepts the bounds page=1, page_size=1 and page_size=200', async () => {
      expect(
        (await parse({ phase_year: '2026', page_size: '1' })).page_size,
      ).toBe(1);
      expect(
        (await parse({ phase_year: '2026', page_size: '200' })).page_size,
      ).toBe(200);
    });
    it.each([
      ['page', '0'],
      ['page', '-1'],
      ['page', '1.5'],
      // Security lens, attempt 1: 1e19 is a valid JS integer, and (page-1)*page_size reaching 1e21
      // is rendered as "1e+21" in the OFFSET, which MySQL rejects (a 500 carrying parser text).
      ['page', '10000000000000000000'],
      ['page', '9223372036854775807'],
      ['page', String(QA_RESULTS_PAGE_MAX + 1)],
      ['page', 'x'],
      ['page', ''],
      ['page_size', '0'],
      ['page_size', '201'],
      ['page_size', '-5'],
      ['page_size', 'x'],
      ['page_size', ''],
    ])('%s=%p -> 400', async (key, value) => {
      await expect(
        parse({ phase_year: '2026', [key]: value }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('page upper bound (security: QAS-10, AC-9)', () => {
    it('accepts page = QA_RESULTS_PAGE_MAX exactly', async () => {
      expect(
        (await parse({ phase_year: '2026', page: String(QA_RESULTS_PAGE_MAX) }))
          .page,
      ).toBe(QA_RESULTS_PAGE_MAX);
    });
    it('the cap keeps the largest OFFSET far below the 1e21 where JS switches to exponent notation', () => {
      const largestOffset =
        (QA_RESULTS_PAGE_MAX - 1) * QA_RESULTS_PAGE_SIZE_MAX;
      expect(largestOffset).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
      expect(String(largestOffset)).not.toMatch(/e/i);
    });
  });

  describe('CSV filters', () => {
    it('absent or empty = no filter', async () => {
      const absent = await parse({ phase_year: '2026' });
      expect(absent.program_ids).toEqual([]);
      expect(absent.result_type_keys).toEqual([]);
      const empty = await parse({
        phase_year: '2026',
        program_ids: '',
        result_type_keys: '',
      });
      expect(empty.program_ids).toEqual([]);
      expect(empty.result_type_keys).toEqual([]);
    });
    it('splits, trims and numbers program_ids; splits result_type_keys', async () => {
      const dto = await parse({
        phase_year: '2026',
        program_ids: '5, 7,,9',
        result_type_keys: 'policy_change,knowledge_product',
      });
      expect(dto.program_ids).toEqual([5, 7, 9]);
      expect(dto.result_type_keys).toEqual([
        'policy_change',
        'knowledge_product',
      ]);
    });
    it('a repeated parameter is treated like a CSV', async () => {
      const dto = await parse({
        phase_year: '2026',
        program_ids: ['5', '7,9'],
      });
      expect(dto.program_ids).toEqual([5, 7, 9]);
    });
    it('accepts a program id at the INT upper bound', async () => {
      expect(
        (
          await parse({
            phase_year: '2026',
            program_ids: String(QA_RESULTS_PROGRAM_ID_MAX),
          })
        ).program_ids,
      ).toEqual([QA_RESULTS_PROGRAM_ID_MAX]);
    });
    it.each([
      '5,abc',
      '0',
      '-3',
      '1.5',
      '5;7',
      // Above the signed 32-bit id range: no program can carry it, and it is unbounded input like `page`.
      '2147483648',
      '5,10000000000000000000',
    ])('program_ids=%p -> 400', async (value) => {
      await expect(
        parse({ phase_year: '2026', program_ids: value }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
