import { Test, TestingModule } from '@nestjs/testing';
import { JwtMiddleware } from './jwt.middleware';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('JwtMiddleware', () => {
  let middleware: JwtMiddleware;
  let jwtService: JwtService;
  let authService: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  };

  const mockPayload = {
    id: mockUser.id,
    email: mockUser.email,
    first_name: mockUser.first_name,
    last_name: mockUser.last_name,
  };

  const mockToken = 'mock.jwt.token';
  const mockNewToken = 'mock.new.jwt.token';

  const mockAuthResponse = {
    message: 'Successful login',
    response: {
      valid: true,
      token: mockToken,
      user: {
        id: mockUser.id,
        user_name: `${mockUser.first_name} ${mockUser.last_name}`,
        email: mockUser.email,
      },
    },
    status: HttpStatus.ACCEPTED,
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };

  const mockAuthService = {
    singIn: jest.fn(),
  };

  const mockRequest = () => {
    const req = {} as Request;
    req.headers = {};
    return req;
  };

  const mockResponse = () => {
    const res = {} as Response;
    res.locals = {};
    res.setHeader = jest.fn();
    return res;
  };

  const mockNext = jest.fn();

  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, JWT_SKEY: 'test-jwt-secret' };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtMiddleware,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    middleware = module.get<JwtMiddleware>(JwtMiddleware);
    jwtService = module.get<JwtService>(JwtService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('Authentication with Basic Auth', () => {
    it('should authenticate with Basic Auth credentials', async () => {
      const credentials = Buffer.from('test@example.com:password123').toString(
        'base64',
      );
      const req = mockRequest();
      req.headers.authorization = `Basic ${credentials}`;

      const res = mockResponse();

      mockAuthService.singIn.mockResolvedValueOnce(mockAuthResponse);
      mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
      mockJwtService.signAsync.mockResolvedValueOnce(mockNewToken);

      await middleware.use(req, res, mockNext);

      expect(authService.singIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: 'test-jwt-secret',
        ignoreExpiration: true,
      });
      expect(res.locals.jwtPayload).toEqual(mockPayload);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { jwtPayload: mockPayload },
        { secret: 'test-jwt-secret', expiresIn: '7h' },
      );
      expect(res.setHeader).toHaveBeenCalledWith('auth', mockNewToken);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Authentication with Auth Header', () => {
    it('should authenticate with auth header token', async () => {
      const req = mockRequest();
      req.headers.auth = mockToken;

      const res = mockResponse();

      mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
      mockJwtService.signAsync.mockResolvedValueOnce(mockNewToken);

      await middleware.use(req, res, mockNext);

      expect(authService.singIn).not.toHaveBeenCalled();
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: 'test-jwt-secret',
        ignoreExpiration: true,
      });
      expect(res.locals.jwtPayload).toEqual(mockPayload);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { jwtPayload: mockPayload },
        { secret: 'test-jwt-secret', expiresIn: '7h' },
      );
      expect(res.setHeader).toHaveBeenCalledWith('auth', mockNewToken);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw HttpException when token verification fails', async () => {
      const req = mockRequest();
      req.headers.auth = 'invalid_token';

      const res = mockResponse();

      const error = new Error('Token verification failed');
      mockJwtService.verifyAsync.mockRejectedValueOnce(error);

      await expect(middleware.use(req, res, mockNext)).rejects.toThrow(
        new HttpException(
          {
            message: 'Invalid token',
            response: {},
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw HttpException when Basic Auth fails', async () => {
      const credentials = Buffer.from(
        'test@example.com:wrong_password',
      ).toString('base64');
      const req = mockRequest();
      req.headers.authorization = `Basic ${credentials}`;

      const res = mockResponse();

      const error = new Error('Authentication failed');
      mockAuthService.singIn.mockRejectedValueOnce(error);

      await expect(middleware.use(req, res, mockNext)).rejects.toThrow(
        new HttpException(
          {
            message: 'Invalid token',
            response: {},
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw HttpException when both auth methods are missing', async () => {
      const req = mockRequest();
      const res = mockResponse();

      mockJwtService.verifyAsync.mockRejectedValueOnce(
        new Error('No token provided'),
      );

      try {
        await middleware.use(req, res, mockNext);
        fail('Expected middleware to throw an exception');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(error.getResponse()).toEqual({
          message: 'Invalid token',
          response: {},
        });
      }

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
