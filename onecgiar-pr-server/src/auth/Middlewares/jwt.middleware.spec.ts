import { Test, TestingModule } from '@nestjs/testing';
import { JwtMiddleware } from './jwt.middleware';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

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
          expiresIn: '7h',
        },
      );
    });
  });
});
