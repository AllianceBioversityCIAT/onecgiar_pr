// @akili-spec quality-assurance/qa-field-catalog
import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerExcludeBilateralGuard } from './throttler-exclude-bilateral.guard';

describe('ThrottlerExcludeBilateralGuard', () => {
  const ctx = (path: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ path }) }),
    }) as unknown as ExecutionContext;

  let superCan: jest.SpyInstance;
  let guard: ThrottlerExcludeBilateralGuard;

  beforeEach(() => {
    superCan = jest
      .spyOn(ThrottlerGuard.prototype, 'canActivate')
      .mockResolvedValue(false);
    guard = Object.create(ThrottlerExcludeBilateralGuard.prototype);
  });
  afterEach(() => superCan.mockRestore());

  it.each(['/api/bilateral/create', '/api/qa/catalog'])(
    'does not throttle %s',
    async (p) => {
      await expect(guard.canActivate(ctx(p))).resolves.toBe(true);
      expect(superCan).not.toHaveBeenCalled();
    },
  );

  it.each(['/api/results/get/all', '/api/qa-other', '/api/qa'])(
    'still throttles %s',
    async (p) => {
      await expect(guard.canActivate(ctx(p))).resolves.toBe(false);
      expect(superCan).toHaveBeenCalledTimes(1);
    },
  );
});
