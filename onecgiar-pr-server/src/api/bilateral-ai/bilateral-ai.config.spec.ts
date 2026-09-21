import {
  BILATERAL_AI_MAX_ATTEMPTS_DEFAULT,
  BILATERAL_AI_ATTEMPT_TIMEOUT_MS_DEFAULT,
  BILATERAL_AI_QUEUE_STALL_MS_DEFAULT,
  getBilateralAiMaxAttempts,
  getBilateralAiAttemptTimeoutMs,
  getBilateralAiQueueStallMs,
  bilateralAiDbNow,
} from './bilateral-ai.config';

describe('bilateral-ai.config', () => {
  const ENV_KEYS = [
    'BILATERAL_AI_MAX_ATTEMPTS',
    'BILATERAL_AI_ATTEMPT_TIMEOUT_MS',
    'BILATERAL_AI_QUEUE_STALL_MS',
  ] as const;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {};
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  describe('defaults (`APF-OQ-6`)', () => {
    it('BILATERAL_AI_MAX_ATTEMPTS_DEFAULT is 3', () => {
      expect(BILATERAL_AI_MAX_ATTEMPTS_DEFAULT).toBe(3);
    });

    it('BILATERAL_AI_ATTEMPT_TIMEOUT_MS_DEFAULT is 15 minutes (10-min mining timeout + 5-min margin), not 35 minutes', () => {
      expect(BILATERAL_AI_ATTEMPT_TIMEOUT_MS_DEFAULT).toBe(15 * 60_000);
      expect(BILATERAL_AI_ATTEMPT_TIMEOUT_MS_DEFAULT).not.toBe(35 * 60_000);
    });

    it('BILATERAL_AI_QUEUE_STALL_MS_DEFAULT is 30 minutes', () => {
      expect(BILATERAL_AI_QUEUE_STALL_MS_DEFAULT).toBe(30 * 60_000);
    });

    it('getBilateralAiMaxAttempts() falls back to the default when unset', () => {
      expect(getBilateralAiMaxAttempts()).toBe(
        BILATERAL_AI_MAX_ATTEMPTS_DEFAULT,
      );
    });

    it('getBilateralAiAttemptTimeoutMs() falls back to the default when unset', () => {
      expect(getBilateralAiAttemptTimeoutMs()).toBe(
        BILATERAL_AI_ATTEMPT_TIMEOUT_MS_DEFAULT,
      );
    });

    it('getBilateralAiQueueStallMs() falls back to the default when unset', () => {
      expect(getBilateralAiQueueStallMs()).toBe(
        BILATERAL_AI_QUEUE_STALL_MS_DEFAULT,
      );
    });
  });

  describe('env overrides', () => {
    it('getBilateralAiMaxAttempts() reads BILATERAL_AI_MAX_ATTEMPTS', () => {
      process.env.BILATERAL_AI_MAX_ATTEMPTS = '5';
      expect(getBilateralAiMaxAttempts()).toBe(5);
    });

    it('getBilateralAiAttemptTimeoutMs() reads BILATERAL_AI_ATTEMPT_TIMEOUT_MS', () => {
      process.env.BILATERAL_AI_ATTEMPT_TIMEOUT_MS = '600000';
      expect(getBilateralAiAttemptTimeoutMs()).toBe(600_000);
    });

    it('getBilateralAiQueueStallMs() reads BILATERAL_AI_QUEUE_STALL_MS', () => {
      process.env.BILATERAL_AI_QUEUE_STALL_MS = '1200000';
      expect(getBilateralAiQueueStallMs()).toBe(1_200_000);
    });

    it('treats an empty-string env var as unset (falls back to default)', () => {
      process.env.BILATERAL_AI_MAX_ATTEMPTS = '';
      expect(getBilateralAiMaxAttempts()).toBe(
        BILATERAL_AI_MAX_ATTEMPTS_DEFAULT,
      );
    });
  });

  describe('bilateralAiDbNow (timezone skew regression)', () => {
    it('is a function returning the literal SQL "CURRENT_TIMESTAMP", never a JS Date instance', () => {
      // timezone skew regression: lifecycle timestamps are written in DB time, never from the
      // process clock — a `Repository#update` raw-SQL value must be a function TypeORM calls to
      // get the SQL fragment, not a computed `new Date()`.
      expect(typeof bilateralAiDbNow).toBe('function');
      expect(bilateralAiDbNow()).toBe('CURRENT_TIMESTAMP');
    });
  });
});
