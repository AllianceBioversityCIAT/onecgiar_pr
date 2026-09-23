// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PtResultsQueryDto } from './pt-results-query.dto';

describe('PtResultsQueryDto', () => {
  it('passes validation and applies the max_results default when nothing is sent', async () => {
    const dto = plainToInstance(PtResultsQueryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.max_results).toBe(5);
    expect(dto.refresh).toBeUndefined();
    expect(dto.mode).toBeUndefined();
  });

  it('passes validation and coerces max_results, refresh and mode', async () => {
    const dto = plainToInstance(PtResultsQueryDto, {
      max_results: '3',
      refresh: 'true',
      mode: 'template',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.max_results).toBe(3);
    expect(dto.refresh).toBe(true);
    expect(dto.mode).toBe('template');
  });

  it('rejects max_results below 1', async () => {
    const dto = plainToInstance(PtResultsQueryDto, { max_results: '0' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'max_results')).toBe(true);
  });

  it('rejects max_results above 10 — PTM-R-6', async () => {
    const dto = plainToInstance(PtResultsQueryDto, { max_results: '20' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'max_results')).toBe(true);
  });

  it('rejects a mode outside auto/template', async () => {
    const dto = plainToInstance(PtResultsQueryDto, { mode: 'invalid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'mode')).toBe(true);
  });

  it('rejects a non-boolean refresh value', async () => {
    const dto = plainToInstance(PtResultsQueryDto, { refresh: 'yes' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'refresh')).toBe(true);
  });
});
