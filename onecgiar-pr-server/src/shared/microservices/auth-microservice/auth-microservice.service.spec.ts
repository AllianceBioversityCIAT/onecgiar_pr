import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { HttpException } from '@nestjs/common';
import { AuthMicroserviceService } from './auth-microservice.service';

describe('AuthMicroserviceService', () => {
  let service: AuthMicroserviceService;
  let httpService: HttpService;

  const originalEnv = process.env;

  const mockEnv = {
    MS_AUTH_URL: 'http://auth-ms.example.com',
    MS_AUTH_USER: 'test-mis-id',
    MS_AUTH_PASSWORD: 'test-mis-secret',
  };

  const mockAuthUrlResponse = {
    data: {
      authUrl: 'https://login.example.com/authorize?client_id=123',
    },
  };

  const mockTokenResponse = {
    data: {
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
      userInfo: {
        sub: 'user123',
        email: 'user@example.com',
        given_name: 'Test',
        family_name: 'User',
      },
    },
  };

  const mockUserInfoResponse = {
    data: {
      sub: 'user123',
      email: 'user@example.com',
      given_name: 'Test',
      family_name: 'User',
    },
  };

  const mockCustomAuthResponse = {
    data: {
      tokens: {
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      userInfo: {
        sub: 'user123',
        email: 'user@example.com',
        given_name: 'Test',
        family_name: 'User',
      },
    },
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, ...mockEnv };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthMicroserviceService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<AuthMicroserviceService>(AuthMicroserviceService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuthenticationUrl', () => {
    it('should return authentication URL for the specified provider', async () => {
      const provider = 'AzureAD';
      mockHttpService.post.mockReturnValueOnce(of(mockAuthUrlResponse));

      const result = await service.getAuthenticationUrl(provider);

      expect(result).toEqual(mockAuthUrlResponse.data);
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockEnv.MS_AUTH_URL}/auth/login/provider`,
        { provider },
        {
          headers: {
            'Content-Type': 'application/json',
            auth: JSON.stringify({
              username: mockEnv.MS_AUTH_USER,
              password: mockEnv.MS_AUTH_PASSWORD,
            }),
          },
        },
      );
    });

    it('should throw HttpException when the request fails', async () => {
      const provider = 'AzureAD';
      const errorResponse = {
        response: {
          data: {
            message: 'Provider not supported',
          },
          status: 400,
        },
      };

      mockHttpService.post.mockReturnValueOnce(throwError(() => errorResponse));

      await expect(service.getAuthenticationUrl(provider)).rejects.toThrow(
        new HttpException('Provider not supported', 400),
      );
    });

    it('should throw generic HttpException when the error has no response data', async () => {
      const provider = 'AzureAD';
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      await expect(service.getAuthenticationUrl(provider)).rejects.toThrow(
        new HttpException('Failed to get authentication URL', 500),
      );
    });
  });

  describe('validateAuthorizationCode', () => {
    it('should validate authorization code and return tokens with user info', async () => {
      const code = 'test-auth-code';
      mockHttpService.post.mockReturnValueOnce(of(mockTokenResponse));

      const result = await service.validateAuthorizationCode(code);

      expect(result).toEqual(mockTokenResponse.data);
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockEnv.MS_AUTH_URL}/auth/validate/code`,
        { code },
        {
          headers: {
            'Content-Type': 'application/json',
            auth: JSON.stringify({
              username: mockEnv.MS_AUTH_USER,
              password: mockEnv.MS_AUTH_PASSWORD,
            }),
          },
        },
      );
    });

    it('should throw HttpException when token validation fails with error response', async () => {
      const code = 'invalid-code';
      const errorResponse = {
        response: {
          data: {
            message: 'Invalid authorization code',
          },
          status: 401,
        },
      };

      mockHttpService.post.mockReturnValueOnce(throwError(() => errorResponse));

      await expect(service.validateAuthorizationCode(code)).rejects.toThrow(
        new HttpException('Invalid authorization code', 401),
      );
    });

    it('should throw generic HttpException when validation fails with no response data', async () => {
      const code = 'invalid-code';
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      await expect(service.validateAuthorizationCode(code)).rejects.toThrow(
        new HttpException('Failed to validate authorization code', 500),
      );
    });
  });

  describe('getUserInfo', () => {
    it('should get user information from access token', async () => {
      const accessToken = 'test-access-token';
      mockHttpService.post.mockReturnValueOnce(of(mockUserInfoResponse));

      const result = await service.getUserInfo(accessToken);

      expect(result).toEqual(mockUserInfoResponse.data);
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockEnv.MS_AUTH_URL}/auth/userinfo`,
        { accessToken },
        {
          headers: {
            'Content-Type': 'application/json',
            auth: JSON.stringify({
              username: mockEnv.MS_AUTH_USER,
              password: mockEnv.MS_AUTH_PASSWORD,
            }),
          },
        },
      );
    });

    it('should throw HttpException when userInfo request fails with error response', async () => {
      const accessToken = 'invalid-token';
      const errorResponse = {
        response: {
          data: {
            message: 'Invalid access token',
          },
          status: 401,
        },
      };

      mockHttpService.post.mockReturnValueOnce(throwError(() => errorResponse));

      await expect(service.getUserInfo(accessToken)).rejects.toThrow(
        new HttpException('Invalid access token', 401),
      );
    });

    it('should throw generic HttpException when userInfo request fails with no response data', async () => {
      const accessToken = 'invalid-token';
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      await expect(service.getUserInfo(accessToken)).rejects.toThrow(
        new HttpException('Failed to get user information', 500),
      );
    });
  });

  describe('authenticateWithCustomCredentials', () => {
    it('should authenticate user with username and password', async () => {
      const username = 'user@example.com';
      const password = 'password123';
      mockHttpService.post.mockReturnValueOnce(of(mockCustomAuthResponse));

      const result = await service.authenticateWithCustomCredentials(
        username,
        password,
      );

      expect(result).toEqual(mockCustomAuthResponse.data);
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockEnv.MS_AUTH_URL}/auth/login/custom`,
        { username, password },
        {
          headers: {
            'Content-Type': 'application/json',
            auth: JSON.stringify({
              username: mockEnv.MS_AUTH_USER,
              password: mockEnv.MS_AUTH_PASSWORD,
            }),
          },
        },
      );
    });

    it('should throw HttpException when authentication fails with error response', async () => {
      const username = 'user@example.com';
      const password = 'wrong-password';
      const errorResponse = {
        response: {
          data: {
            message: 'Invalid credentials',
          },
          status: 401,
        },
      };

      mockHttpService.post.mockReturnValueOnce(throwError(() => errorResponse));

      await expect(
        service.authenticateWithCustomCredentials(username, password),
      ).rejects.toThrow(new HttpException('Invalid credentials', 401));
    });

    it('should throw generic HttpException when authentication fails with no response data', async () => {
      const username = 'user@example.com';
      const password = 'wrong-password';
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      await expect(
        service.authenticateWithCustomCredentials(username, password),
      ).rejects.toThrow(new HttpException('Authentication failed', 500));
    });
  });
});
