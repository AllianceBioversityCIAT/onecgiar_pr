import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBilateralFieldRevisionDto } from './create-bilateral-field-revision.dto';
import { ResultFieldRevisionFieldName } from '../../ai/entities/result-field-revision.entity';

// @akili-spec bilateral/qa-ai-text-suggestions (BIL-QTS-T-7) — advisory: `old_value` is stored
// verbatim in the audit row, so an unbounded client string would let a hostile or buggy caller
// grow `result_field_revision` without limit.
describe('CreateBilateralFieldRevisionDto.old_value', () => {
  const validateOldValue = async (old_value: unknown) => {
    const dto = plainToInstance(CreateBilateralFieldRevisionDto, {
      field: ResultFieldRevisionFieldName.TITLE,
      assessment_id: 5,
      old_value,
    });
    const errors = await validate(dto);
    return errors.find((error) => error.property === 'old_value');
  };

  it('accepts a value at the 10000-character limit', async () => {
    expect(await validateOldValue('a'.repeat(10000))).toBeUndefined();
  });

  it('rejects a value over the 10000-character limit', async () => {
    const error = await validateOldValue('a'.repeat(10001));
    expect(error).toBeDefined();
    expect(error?.constraints).toHaveProperty('maxLength');
  });

  it('accepts a null value (optional)', async () => {
    expect(await validateOldValue(null)).toBeUndefined();
  });
});
