import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthMicroserviceService {
  private readonly logger = new Logger(AuthMicroserviceService.name);
  private readonly authMicroserviceUrl: string;
  private readonly misId: string;
  private readonly misSecret: string;

  constructor(private readonly httpService: HttpService) {
    this.authMicroserviceUrl = process.env.MS_AUTH_URL;

    this.misId = process.env.MS_AUTH_USER;
    this.misSecret = process.env.MS_AUTH_PASSWORD;

    this.logger.log('Auth Microservice initialized');
    this.logger.log(`Auth Microservice URL: ${this.authMicroserviceUrl}`);
  }

  /**
   * Get authentication URL for the specified provider
   * @param provider Auth provider (e.g., 'AzureAD', 'Google', etc.)
   * @returns Authentication URL
   */
  async getAuthenticationUrl(provider: string): Promise<{ authUrl: string }> {
    try {
      this.logger.log(`Getting authentication URL for provider: ${provider}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/login/provider`,
          { provider },
          {
            headers: {
              'Content-Type': 'application/json',
              auth: JSON.stringify({
                username: this.misId,
                password: this.misSecret,
              }),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error getting authentication URL: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data?.message || 'Failed to get authentication URL',
        error.response?.status || 500,
      );
    }
  }

  /**
   * Validate the authorization code and get tokens
   * @param code Authorization code from OAuth provider
   * @returns Token information and user profile
   */
  async validateAuthorizationCode(code: string): Promise<any> {
    try {
      this.logger.log('Validating authorization code');

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/validate/code`,
          { code },
          {
            headers: {
              'Content-Type': 'application/json',
              auth: JSON.stringify({
                username: this.misId,
                password: this.misSecret,
              }),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error validating authorization code: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data?.message ||
          'Failed to validate authorization code',
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get user information from access token
   * @param accessToken Access token
   * @returns User profile information
   */
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      this.logger.log('Getting user information');

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/userinfo`,
          { accessToken },
          {
            headers: {
              'Content-Type': 'application/json',
              auth: JSON.stringify({
                username: this.misId,
                password: this.misSecret,
              }),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error getting user information: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data?.message || 'Failed to get user information',
        error.response?.status || 500,
      );
    }
  }

  /**
   * Authenticate with custom credentials
   * @param username User email
   * @param password User password
   * @returns Authentication result with tokens and user info
   */
  async authenticateWithCustomCredentials(
    username: string,
    password: string,
  ): Promise<any> {
    try {
      this.logger.log(`Authenticating user: ${username}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/login/custom`,
          { username, password },
          {
            headers: {
              'Content-Type': 'application/json',
              auth: JSON.stringify({
                username: this.misId,
                password: this.misSecret,
              }),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error authenticating user: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data?.message || 'Authentication failed',
        error.response?.status || 500,
      );
    }
  }
}
