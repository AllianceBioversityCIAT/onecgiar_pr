import { Test, TestingModule } from '@nestjs/testing';
import { JwtMiddleware } from './jwt.middleware';
import { SearchThrottleMiddleware } from './search-throttle.middleware';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus, RequestMethod } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../modules/user/repositories/user.repository';
import { AuthModule } from '../auth.module';

describe('JwtMiddleware', () => {
  let middleware: JwtMiddleware;
  let jwtService: JwtService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockJwtPayload = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  };

  const mockToken = 'mock-jwt-token';
  const mockNewToken = 'mock-new-jwt-token';

  beforeEach(async () => {
    process.env.JWT_SKEY = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtMiddleware,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
            signAsync: jest.fn().mockResolvedValue(mockNewToken),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockJwtPayload),
            updateLastLogin: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    middleware = module.get<JwtMiddleware>(JwtMiddleware);
    jwtService = module.get<JwtService>(JwtService);

    mockRequest = {
      headers: {},
      get path() {
        return '/api/some-endpoint';
      },
    };

    mockResponse = {
      locals: {},
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Routes', () => {
    it('should allow access to /login/provider without token', async () => {
      mockRequest = {
        ...mockRequest,
        get path() {
          return '/auth/login/provider';
        },
      };

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should allow access to /login/custom without token', async () => {
      mockRequest = {
        ...mockRequest,
        get path() {
          return '/auth/login/custom';
        },
      };

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should allow access to /validate/code without token', async () => {
      mockRequest = {
        ...mockRequest,
        get path() {
          return '/auth/validate/code';
        },
      };

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('Protected Routes', () => {
    it('should successfully validate token and set new token in header', async () => {
      mockRequest.headers['auth'] = mockToken;
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockJwtPayload);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: 'test-secret',
      });
      expect(mockResponse.locals.jwtPayload).toEqual(mockJwtPayload);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('auth', mockNewToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error when Basic Auth is provided', async () => {
      mockRequest.headers.authorization = 'Basic dGVzdDp0ZXN0';

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Basic Auth not allowed. Use login endpoint.',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw error when no auth token is provided', async () => {
      mockRequest.headers['auth'] = undefined;

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Authorization token is required',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired token error', async () => {
      mockRequest.headers['auth'] = mockToken;
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(expiredError);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Token has expired',
            response: {
              valid: false,
              shouldRefreshToken: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle invalid token error', async () => {
      mockRequest.headers['auth'] = mockToken;
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Invalid token',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw error when token payload is missing required fields', async () => {
      mockRequest.headers['auth'] = mockToken;
      const invalidPayload = { id: 1 };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(invalidPayload);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Invalid token payload',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw error when token payload is null', async () => {
      mockRequest.headers['auth'] = mockToken;
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(null);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Invalid token payload',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockRequest.headers['auth'] = mockToken;
      const unexpectedError = new Error('Database connection failed');
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(unexpectedError);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Invalid token',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should rethrow HttpException as is', async () => {
      mockRequest.headers['auth'] = mockToken;
      const customException = new HttpException(
        'Invalid token',
        HttpStatus.FORBIDDEN,
      );
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(customException);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(customException);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should sign new token with all user data', async () => {
      mockRequest.headers['auth'] = mockToken;
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockJwtPayload);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          id: mockJwtPayload.id,
          email: mockJwtPayload.email,
          first_name: mockJwtPayload.first_name,
          last_name: mockJwtPayload.last_name,
        },
        {
          secret: 'test-secret',
        },
      );
    });
  });

  // Regression guard for P2-3854: the `/api/bilateral/center/*` surface is
  // session-authenticated and MUST go through normal JWT verification, while the
  // headless handoff exchange (CLARISA-key authenticated) stays public. Before the
  // fix, `publicRoutes` matched the bare `/api/bilateral` prefix, so every
  // `center/*` route was treated as public: an invalid token was silently ignored
  // and the request continued with the unverified `@UserToken()` identity.
  describe('Bilateral center routes are authenticated (P2-3854)', () => {
    const centerPath = '/api/bilateral/center/projects';

    const withPath = (path: string) => {
      mockRequest = {
        ...mockRequest,
        get path() {
          return path;
        },
      };
    };

    it('rejects a center route with no token (401, redirect to login)', async () => {
      withPath(centerPath);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Authorization token is required',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('rejects a center route with an invalid token instead of ignoring it', async () => {
      withPath(centerPath);
      mockRequest.headers['auth'] = mockToken;
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('invalid signature'));

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(
        new HttpException(
          {
            message: 'Invalid token',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: 'test-secret',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('accepts a center route with a valid token and rolls the session', async () => {
      withPath(centerPath);
      mockRequest.headers['auth'] = mockToken;
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockJwtPayload);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest['user']).toEqual(mockJwtPayload);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('auth', mockNewToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('keeps the handoff exchange public: no token still calls next()', async () => {
      withPath('/api/bilateral/handoff/exchange');

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('Route mounting (OTP-T-4)', () => {
    // /auth/login/otp/config must be reachable without a token. AuthModule (mounted at
    // path 'auth' by main.routes.ts) is the module that owns this route, and its own
    // `configure()` is what decides which of its routes JwtMiddleware intercepts — so this
    // asserts the actual mount configuration (a fake MiddlewareConsumer, not a mocked
    // JwtMiddleware) rather than calling `middleware.use()` directly, which would prove
    // the opposite (that the path IS intercepted). AppModule's own JwtMiddleware mount
    // (`api/*path`, `v2/*path`, `clarisa/*path`, `toc/*path`, `type-one-report` —
    // asserted in app.module.spec.ts) never lists an `auth/*` path either.
    it('mounts JwtMiddleware only on the pusher-auth route, never on /auth/login/otp/config', () => {
      const chain: {
        apply: jest.Mock;
        forRoutes: jest.Mock;
      } = {} as any;
      chain.apply = jest.fn().mockReturnValue(chain);
      chain.forRoutes = jest.fn().mockReturnValue(chain);

      new AuthModule().configure(chain as any);

      expect(chain.apply).toHaveBeenNthCalledWith(1, JwtMiddleware);
      expect(chain.forRoutes).toHaveBeenNthCalledWith(1, {
        path: '/auth/signing/pusher/result/:resultId/:user',
        method: RequestMethod.POST,
      });
      expect(chain.apply).toHaveBeenNthCalledWith(2, SearchThrottleMiddleware);
      expect(chain.forRoutes).toHaveBeenNthCalledWith(2, {
        path: '/auth/users/search',
        method: RequestMethod.GET,
      });

      const mountedPaths = chain.forRoutes.mock.calls.map(
        ([route]) => route.path,
      );
      expect(mountedPaths).not.toContain('/auth/login/otp/config');
      expect(
        mountedPaths.some((path: string) => path.includes('login/otp')),
      ).toBe(false);
    });
  });
});
