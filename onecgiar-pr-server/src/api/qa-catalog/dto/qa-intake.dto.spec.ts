// @akili-spec quality-assurance/qa-intake
import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { QaIntakeDto } from './qa-intake.dto';

// Same pipe options the controller uses, so the spec exercises the runtime path.
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const parse = (body: unknown): Promise<QaIntakeDto> =>
  pipe.transform(body, {
    type: 'body',
    metatype: QaIntakeDto,
  }) as Promise<QaIntakeDto>;
const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('QaIntakeDto (QIN-R-2)', () => {
  it('accepts the contract body', async () => {
    const out = await parse({ phase_year: 2026, result_ids: [1, 2] });
    expect({ ...out }).toEqual({ phase_year: 2026, result_ids: [1, 2] });
  });

  it('(e) 50 ids are accepted and 51 are a 400', async () => {
    await expect(
      parse({ phase_year: 2026, result_ids: ids(50) }),
    ).resolves.toBeDefined();
    await expect(
      parse({ phase_year: 2026, result_ids: ids(51) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('duplicates are NOT a 400 (the service collapses them), and count against the bound as sent', async () => {
    const out = await parse({ phase_year: 2026, result_ids: [7, 7, 8] });
    expect(out.result_ids).toEqual([7, 7, 8]);
    await expect(
      parse({ phase_year: 2026, result_ids: Array(51).fill(1) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('(f) an extra property is a 400 that names it, not a silent strip', async () => {
    const err = await parse({
      phase_year: 2026,
      result_ids: [1],
      platform_id: 99,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify(err.getResponse())).toContain('platform_id');
  });

  it.each([
    ['no year', { result_ids: [1] }],
    ['a year given as text', { phase_year: '2026', result_ids: [1] }],
    ['a year below range', { phase_year: 1999, result_ids: [1] }],
    ['a year above range', { phase_year: 2101, result_ids: [1] }],
    ['no ids', { phase_year: 2026 }],
    ['an empty list', { phase_year: 2026, result_ids: [] }],
    ['a zero id', { phase_year: 2026, result_ids: [0] }],
    ['a negative id', { phase_year: 2026, result_ids: [-4] }],
    ['a fractional id', { phase_year: 2026, result_ids: [1.5] }],
    ['an id as text', { phase_year: 2026, result_ids: ['7'] }],
    ['ids that are not a list', { phase_year: 2026, result_ids: 7 }],
    ['an id above the 32-bit range', { phase_year: 2026, result_ids: [1e21] }],
  ])('%s -> 400', async (_label, body) => {
    await expect(parse(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('the year bounds 2000 and 2100 are accepted', async () => {
    await expect(
      parse({ phase_year: 2000, result_ids: [1] }),
    ).resolves.toBeDefined();
    await expect(
      parse({ phase_year: 2100, result_ids: [1] }),
    ).resolves.toBeDefined();
  });
});
