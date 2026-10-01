import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBilateralDto } from './create-bilateral.dto';

/**
 * @akili-spec changes/bilateral-create-upsert-by-code — UBC-R-11.
 *
 * Producers (STAR, MEL, TIP) send `data.result_code` either as a string or as a JSON
 * integer, and the Fetcher forwards it untouched. Both shapes must reach the service as
 * the same digits-only string; anything that is not a whole non-negative code must still
 * be rejected by validation.
 */
describe('CreateBilateralDto.result_code', () => {
  const toDto = (result_code: unknown) =>
    plainToInstance(CreateBilateralDto, { result_code });

  const resultCodeError = async (result_code: unknown) => {
    const errors = await validate(toDto(result_code));
    return errors.find((error) => error.property === 'result_code');
  };

  it.each([
    ['28565', '28565'],
    [28565, '28565'],
    [' 28565 ', '28565'],
    [0, '0'],
  ])('accepts %p and normalises it to %p', async (input, expected) => {
    expect(toDto(input).result_code).toBe(expected);
    expect(await resultCodeError(input)).toBeUndefined();
  });

  it.each([28565.5, -1, true, {}, [], '28a65', '', '-28565', Number.MAX_VALUE])(
    'rejects %p',
    async (input) => {
      expect(await resultCodeError(input)).toBeDefined();
    },
  );

  it('stays optional: an absent code passes validation', async () => {
    expect(toDto(undefined).result_code).toBeUndefined();
    expect(await resultCodeError(undefined)).toBeUndefined();
  });
});
