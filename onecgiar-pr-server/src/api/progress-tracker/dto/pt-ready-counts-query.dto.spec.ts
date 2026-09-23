// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PtReadyCountsQueryDto } from './pt-ready-counts-query.dto';

describe('PtReadyCountsQueryDto', () => {
  it('passes validation and applies the min_evidence default when nothing is sent', async () => {
    const dto = plainToInstance(PtReadyCountsQueryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.min_evidence).toBe(1);
  });

  it('passes validation and coerces a numeric string', async () => {
    const dto = plainToInstance(PtReadyCountsQueryDto, { min_evidence: '4' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.min_evidence).toBe(4);
  });

  it('accepts 0 (no lower-bound floor beyond non-negative)', async () => {
    const dto = plainToInstance(PtReadyCountsQueryDto, { min_evidence: '0' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.min_evidence).toBe(0);
  });

  it('rejects a negative min_evidence', async () => {
    const dto = plainToInstance(PtReadyCountsQueryDto, { min_evidence: '-1' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'min_evidence')).toBe(true);
  });

  it('rejects a non-numeric min_evidence', async () => {
    const dto = plainToInstance(PtReadyCountsQueryDto, {
      min_evidence: 'abc',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'min_evidence')).toBe(true);
  });
});
