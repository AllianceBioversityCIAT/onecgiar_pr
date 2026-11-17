import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { RoleEnum } from '../../shared/constants/role-type.enum';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { QaSpAccessService } from './qa-sp-access.service';
import { QA_SP_MESSAGES } from './qa-sp-access.constants';

// Sentinels: none of these may ever appear in a log line.
const API_KEY = 'sentinel-api-key-value-0123456789abcdef';
const ISSUED_CODE = 'sentinel-issued-code-abcdefghijklmnopqrstuvwxyz0';
const USER: TokenDto = {
  id: 42,
  email: 'sentinel.person@example.org',
  first_name: 'Ada',
  last_name: 'Lovelace',
};
const BASE_URL = 'https://qa-api.example.test/api/v1';

const qaError = (status: number, code?: string) => ({
  response: {
    status,
    data: {
      success: false,
      error: { status, code, message: `body-${ISSUED_CODE}` },
      meta: { requestId: 'req-1' },
    },
  },
  config: { headers: { 'x-api-key': API_KEY } },
  message: `Request failed ${API_KEY}`,
});

describe('QaSpAccessService (P2-3911)', () => {
  let service: QaSpAccessService;
  let http: { post: jest.Mock };
  let roles: {
    isUserAdmin: jest.Mock;
    hasRoleOnProgramByOfficialCode: jest.Mock;
  };
  let logSpies: jest.SpyInstance[];
  const envBackup = { ...process.env };

  const okResponse = () =>
    of({
      status: 201,
      data: {
        success: true,
        data: { code: ISSUED_CODE, expiresAt: '2026-11-17T12:01:00.000Z' },
        meta: { requestId: 'req-ok' },
      },
    });

  const allLogText = () =>
    logSpies
      .flatMap((spy) => spy.mock.calls)
      .map((args) => JSON.stringify(args))
      .join('\n');

  const expectHttpError = async (
    promise: Promise<unknown>,
    status: number,
    message: string,
  ) => {
    const error = await promise.catch((e) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(status);
    expect((error as HttpException).message).toBe(message);
  };

  beforeEach(async () => {
    process.env.QA_SP_ACCESS_API_URL = `${BASE_URL}/`;
    process.env.QA_SP_ACCESS_API_KEY = API_KEY;
    http = { post: jest.fn().mockReturnValue(okResponse()) };
    roles = {
      isUserAdmin: jest.fn().mockResolvedValue(false),
      hasRoleOnProgramByOfficialCode: jest.fn().mockResolvedValue(true),
    };
    logSpies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        QaSpAccessService,
        { provide: HttpService, useValue: http },
        { provide: RoleByUserRepository, useValue: roles },
      ],
    }).compile();
    service = moduleRef.get(QaSpAccessService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...envBackup };
  });

  afterEach(() => {
    const text = allLogText();
    expect(text).not.toContain(API_KEY);
    expect(text).not.toContain(ISSUED_CODE);
    expect(text).not.toContain(USER.email);
  });

  describe('authorization', () => {
    it('lets a program member through and calls QA with the contract body', async () => {
      const result = await service.getSpLink(USER, ' SP01 ');

      expect(result).toEqual({
        code: ISSUED_CODE,
        expiresAt: '2026-11-17T12:01:00.000Z',
      });
      expect(roles.hasRoleOnProgramByOfficialCode).toHaveBeenCalledWith(
        42,
        'SP01',
        [
          RoleEnum.LEAD,
          RoleEnum.CO_LEAD,
          RoleEnum.COORDINATOR,
          RoleEnum.MEMBER,
        ],
      );
      expect(http.post).toHaveBeenCalledWith(
        `${BASE_URL}/sp-access/codes`,
        {
          email: USER.email,
          name: 'Ada Lovelace',
          programCode: 'SP01',
          isReportingAdmin: false,
        },
        {
          headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
          timeout: 10_000,
        },
      );
    });

    it('answers 403 to a non-member without calling QA', async () => {
      roles.hasRoleOnProgramByOfficialCode.mockResolvedValue(false);

      await expectHttpError(
        service.getSpLink(USER, 'SP02'),
        HttpStatus.FORBIDDEN,
        QA_SP_MESSAGES.forbidden,
      );
      expect(http.post).not.toHaveBeenCalled();
    });

    it('answers 403 to a non-admin without a program, without calling QA', async () => {
      await expectHttpError(
        service.getSpLink(USER, undefined),
        HttpStatus.FORBIDDEN,
        QA_SP_MESSAGES.programRequired,
      );
      expect(roles.hasRoleOnProgramByOfficialCode).not.toHaveBeenCalled();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('lets an admin through with a chosen program, without a membership check', async () => {
      roles.isUserAdmin.mockResolvedValue(true);

      await service.getSpLink(USER, 'SP05');

      expect(roles.hasRoleOnProgramByOfficialCode).not.toHaveBeenCalled();
      expect(http.post.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          programCode: 'SP05',
          isReportingAdmin: true,
        }),
      );
    });

    it('lets an admin through with programCode null', async () => {
      roles.isUserAdmin.mockResolvedValue(true);

      await service.getSpLink(USER, '');

      expect(http.post.mock.calls[0][1]).toEqual(
        expect.objectContaining({ programCode: null, isReportingAdmin: true }),
      );
    });

    it('rejects a malformed program code with 400 before any lookup', async () => {
      await expectHttpError(
        service.getSpLink(USER, "SP01' OR 1=1"),
        HttpStatus.BAD_REQUEST,
        QA_SP_MESSAGES.invalidProgram,
      );
      expect(roles.isUserAdmin).not.toHaveBeenCalled();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('answers 401 when the session carries no user', async () => {
      await expectHttpError(
        service.getSpLink({ id: 0, email: '' } as TokenDto, 'SP01'),
        HttpStatus.UNAUTHORIZED,
        QA_SP_MESSAGES.forbidden,
      );
      expect(http.post).not.toHaveBeenCalled();
    });

    it('falls back to the email local part when the token has no name', async () => {
      await service.getSpLink(
        { ...USER, first_name: undefined, last_name: ' ' } as TokenDto,
        'SP01',
      );
      expect(http.post.mock.calls[0][1].name).toBe('sentinel.person');
    });
  });

  describe('QA error mapping', () => {
    it.each([
      [
        'SP_PROGRAM_UNKNOWN',
        qaError(400, 'SP_PROGRAM_UNKNOWN'),
        HttpStatus.NOT_FOUND,
        QA_SP_MESSAGES.programUnknown,
      ],
      [
        'SP_ACCESS_DISABLED',
        qaError(503, 'SP_ACCESS_DISABLED'),
        HttpStatus.SERVICE_UNAVAILABLE,
        QA_SP_MESSAGES.disabled,
      ],
      [
        'SP_ACCESS_KEY_INVALID (401)',
        qaError(401, 'SP_ACCESS_KEY_INVALID'),
        HttpStatus.BAD_GATEWAY,
        QA_SP_MESSAGES.generic,
      ],
      [
        'VALIDATION_FAILED (400)',
        qaError(400, 'VALIDATION_FAILED'),
        HttpStatus.BAD_GATEWAY,
        QA_SP_MESSAGES.generic,
      ],
      ['5xx', qaError(502), HttpStatus.BAD_GATEWAY, QA_SP_MESSAGES.generic],
      [
        'timeout',
        { code: 'ECONNABORTED', message: `timeout ${API_KEY}` },
        HttpStatus.GATEWAY_TIMEOUT,
        QA_SP_MESSAGES.generic,
      ],
      [
        'network failure',
        { code: 'ECONNREFUSED', message: 'connect refused' },
        HttpStatus.BAD_GATEWAY,
        QA_SP_MESSAGES.generic,
      ],
    ])('maps %s', async (_label, error, status, message) => {
      http.post.mockReturnValue(throwError(() => error));

      await expectHttpError(service.getSpLink(USER, 'SP01'), status, message);
      expect(http.post).toHaveBeenCalledTimes(1); // no retry
    });

    it('logs a rejected key without the key', async () => {
      http.post.mockReturnValue(
        throwError(() => qaError(401, 'SP_ACCESS_KEY_INVALID')),
      );

      await service.getSpLink(USER, 'SP01').catch(() => undefined);

      expect(allLogText()).toContain('qa.spLink.keyRejected');
    });

    it('answers a generic error when QA returns an unexpected body', async () => {
      http.post.mockReturnValue(of({ status: 201, data: { success: true } }));

      await expectHttpError(
        service.getSpLink(USER, 'SP01'),
        HttpStatus.BAD_GATEWAY,
        QA_SP_MESSAGES.generic,
      );
    });

    it('answers 503 without calling QA when the URL or key is not configured', async () => {
      delete process.env.QA_SP_ACCESS_API_KEY;

      await expectHttpError(
        service.getSpLink(USER, 'SP01'),
        HttpStatus.SERVICE_UNAVAILABLE,
        QA_SP_MESSAGES.disabled,
      );
      expect(http.post).not.toHaveBeenCalled();
    });
  });

  it('never logs the key, the code or the email on success', async () => {
    await service.getSpLink(USER, 'SP01');
    // assertions live in the afterEach sentinel check
    expect(http.post).toHaveBeenCalled();
  });
});
