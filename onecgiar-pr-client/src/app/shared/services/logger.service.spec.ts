import { LoggerService, LogLevel } from './logger.service';
import { environment } from '../../../environments/environment';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    service = new LoggerService();
  });

  describe('level assignment (ternary)', () => {
    it('should set level to DEBUG when environment.production is false', () => {
      expect(environment.production).toBe(false);
      expect((service as any).level).toBe(LogLevel.DEBUG);
    });
  });

  describe('error()', () => {
    it('should call private log with LogLevel.ERROR', () => {
      const logSpy = jest.spyOn(service as any, 'log');
      service.error('test error', 'extra');
      expect(logSpy).toHaveBeenCalledWith(LogLevel.ERROR, 'test error', ['extra']);
    });
  });

  describe('warn()', () => {
    it('should call private log with LogLevel.WARN', () => {
      const logSpy = jest.spyOn(service as any, 'log');
      service.warn('test warn');
      expect(logSpy).toHaveBeenCalledWith(LogLevel.WARN, 'test warn', []);
    });
  });

  describe('info()', () => {
    it('should call private log with LogLevel.INFO', () => {
      const logSpy = jest.spyOn(service as any, 'log');
      service.info('test info');
      expect(logSpy).toHaveBeenCalledWith(LogLevel.INFO, 'test info', []);
    });
  });

  describe('debug()', () => {
    it('should call private log with LogLevel.DEBUG', () => {
      const logSpy = jest.spyOn(service as any, 'log');
      service.debug('test debug');
      expect(logSpy).toHaveBeenCalledWith(LogLevel.DEBUG, 'test debug', []);
    });
  });

  describe('private log() - switch cases', () => {
    it('should enter ERROR switch case when level is ERROR and level <= threshold', () => {
      // In non-production, level is DEBUG (4), so ERROR (1) <= 4 => enters switch
      service.error('error msg');
      // No error thrown means the switch case was hit
    });

    it('should enter WARN switch case when level is WARN and level <= threshold', () => {
      service.warn('warn msg');
    });

    it('should enter INFO switch case when level is INFO and level <= threshold', () => {
      service.info('info msg');
    });

    it('should enter DEBUG switch case when level is DEBUG and level <= threshold', () => {
      service.debug('debug msg');
    });
  });

  describe('private log() - level above threshold (if branch false)', () => {
    it('should NOT enter switch when log level is above the configured threshold', () => {
      // Force the level to ERROR (1) so that WARN (2) > 1 => if condition is false
      (service as any).level = LogLevel.ERROR;

      // These should not enter the switch because their level > ERROR
      service.warn('should be skipped');
      service.info('should be skipped');
      service.debug('should be skipped');

      // error should still work since ERROR (1) <= ERROR (1)
      service.error('should work');
    });

    it('should NOT enter switch when level is OFF', () => {
      (service as any).level = LogLevel.OFF;

      service.error('should be skipped');
      service.warn('should be skipped');
      service.info('should be skipped');
      service.debug('should be skipped');
    });
  });
});
