import { NoopBilateralHandler } from './noop.handler';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('NoopBilateralHandler', () => {
  it('exposes OTHER_OUTPUT as resultType and performs no operations', async () => {
    const handler = new NoopBilateralHandler();

    expect(handler.resultType).toBe(ResultTypeEnum.OTHER_OUTPUT);
    await expect(handler.initializeResultHeader()).resolves.toBeNull();
    await expect(handler.afterCreate()).resolves.toBeUndefined();
  });
});
