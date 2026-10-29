// @akili-spec quality-assurance/qa-intake
import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { QaReleaseDto } from './qa-release.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const parse = (body: unknown): Promise<QaReleaseDto> =>
  pipe.transform(body, {
    type: 'body',
    metatype: QaReleaseDto,
  }) as Promise<QaReleaseDto>;
const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ result_id: i + 1, outcome: 'qaed' }));
const messageOf = (err: BadRequestException) =>
  JSON.stringify(err.getResponse());

describe('QaReleaseDto (QIN-R-2)', () => {
  it('accepts the contract body, both outcomes', async () => {
    const out = await parse({
      phase_year: 2026,
      items: [
        { result_id: 1, outcome: 'qaed' },
        { result_id: 2, outcome: 'not_qaed' },
      ],
    });
    expect(out.items.map((i) => ({ ...i }))).toEqual([
      { result_id: 1, outcome: 'qaed' },
      { result_id: 2, outcome: 'not_qaed' },
    ]);
  });

  it('(c) an unknown outcome is a 400 that names outcome', async () => {
    const err = await parse({
      phase_year: 2026,
      items: [{ result_id: 10, outcome: 'approved' }],
    }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(messageOf(err)).toContain('outcome');
  });

  it('a missing outcome is a 400 that names outcome', async () => {
    const err = await parse({
      phase_year: 2026,
      items: [{ result_id: 10 }],
    }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(messageOf(err)).toContain('outcome');
  });

  it('(d) a repeated result_id is a 400, even with different outcomes', async () => {
    for (const body of [
      {
        phase_year: 2026,
        items: [
          { result_id: 5, outcome: 'qaed' },
          { result_id: 5, outcome: 'qaed' },
        ],
      },
      {
        phase_year: 2026,
        items: [
          { result_id: 5, outcome: 'qaed' },
          { result_id: 6, outcome: 'qaed' },
          { result_id: 5, outcome: 'not_qaed' },
        ],
      },
    ]) {
      await expect(parse(body)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('(e) 50 items are accepted and 51 are a 400', async () => {
    await expect(
      parse({ phase_year: 2026, items: items(50) }),
    ).resolves.toBeDefined();
    await expect(
      parse({ phase_year: 2026, items: items(51) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('(f) an extra property, at the body or the item level, is a 400', async () => {
    const top = await parse({
      phase_year: 2026,
      items: items(1),
      platform_id: 3,
    }).catch((e) => e);
    expect(top).toBeInstanceOf(BadRequestException);
    expect(messageOf(top)).toContain('platform_id');
    const nested = await parse({
      phase_year: 2026,
      items: [{ result_id: 1, outcome: 'qaed', note: 'x' }],
    }).catch((e) => e);
    expect(nested).toBeInstanceOf(BadRequestException);
    expect(messageOf(nested)).toContain('note');
  });

  it.each([
    ['no year', { items: items(1) }],
    ['a year out of range', { phase_year: 1999, items: items(1) }],
    ['a year as text', { phase_year: '2026', items: items(1) }],
    ['no items', { phase_year: 2026 }],
    ['an empty list', { phase_year: 2026, items: [] }],
    ['items that are not a list', { phase_year: 2026, items: {} }],
    ['an item that is not an object', { phase_year: 2026, items: [5] }],
    [
      'a zero id',
      { phase_year: 2026, items: [{ result_id: 0, outcome: 'qaed' }] },
    ],
    [
      'a fractional id',
      { phase_year: 2026, items: [{ result_id: 1.5, outcome: 'qaed' }] },
    ],
    [
      'an id as text',
      { phase_year: 2026, items: [{ result_id: '7', outcome: 'qaed' }] },
    ],
    [
      'an id above the 32-bit range',
      { phase_year: 2026, items: [{ result_id: 1e21, outcome: 'qaed' }] },
    ],
  ])('%s -> 400', async (_label, body) => {
    await expect(parse(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
