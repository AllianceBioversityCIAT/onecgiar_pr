// @akili-spec quality-assurance/qa-results-feed
import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { QaResultsDetailsDto } from './qa-results-details.dto';

// Same pipe options the controller uses, so the spec exercises the runtime path.
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: false,
});
const parse = (body: unknown): Promise<QaResultsDetailsDto> =>
  pipe.transform(body, {
    type: 'body',
    metatype: QaResultsDetailsDto,
  }) as Promise<QaResultsDetailsDto>;
const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('QaResultsDetailsDto (QRF-R-2 / R-7)', () => {
  it('accepts the contract body and strips what it does not declare', async () => {
    const out = await parse({
      phase_year: 2026,
      result_ids: [1, 2],
      field_keys: ['general.title'],
      extra: 'x',
    });
    expect({ ...out }).toEqual({
      phase_year: 2026,
      result_ids: [1, 2],
      field_keys: ['general.title'],
    });
  });

  it('(e) 50 ids are accepted and 51 are a 400', async () => {
    await expect(
      parse({ phase_year: 2026, result_ids: ids(50) }),
    ).resolves.toBeDefined();
    await expect(
      parse({ phase_year: 2026, result_ids: ids(51) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('duplicates still count against the bound as sent', async () => {
    await expect(
      parse({ phase_year: 2026, result_ids: Array(51).fill(1) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['no year', { result_ids: [1] }],
    ['a year given as text', { phase_year: '2026', result_ids: [1] }],
    ['a year out of range', { phase_year: 1999, result_ids: [1] }],
    ['no ids', { phase_year: 2026 }],
    ['an empty list', { phase_year: 2026, result_ids: [] }],
    ['a zero id', { phase_year: 2026, result_ids: [0] }],
    ['a negative id', { phase_year: 2026, result_ids: [-4] }],
    ['a fractional id', { phase_year: 2026, result_ids: [1.5] }],
    ['an id as text', { phase_year: 2026, result_ids: ['7'] }],
    ['ids that are not a list', { phase_year: 2026, result_ids: 7 }],
    ['an id above the 32-bit range', { phase_year: 2026, result_ids: [1e21] }],
    [
      'an empty field_keys',
      { phase_year: 2026, result_ids: [1], field_keys: [] },
    ],
    [
      'a field key that is not text',
      { phase_year: 2026, result_ids: [1], field_keys: [3] },
    ],
    [
      'a field key that is too long',
      { phase_year: 2026, result_ids: [1], field_keys: ['k'.repeat(201)] },
    ],
  ])('%s -> 400', async (_name, body) => {
    await expect(parse(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
