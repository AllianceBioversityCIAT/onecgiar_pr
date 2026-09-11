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
  async getAuthenticationUrl(
    provider: string,
    redirectUri?: string,
  ): Promise<{ authUrl: string }> {
    try {
      this.logger.log(`Getting authentication URL for provider: ${provider}`);

      const body: Record<string, string> = { provider };
      if (redirectUri) body.redirectUri = redirectUri;

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/login/provider`,
          body,
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
        error.response?.data?.message ?? 'Failed to get authentication URL',
        error.response?.status ?? 500,
      );
    }
  }

  /**
   * Validate the authorization code and get tokens
   * @param code Authorization code from OAuth provider
   * @returns Token information and user profile
   */
  async validateAuthorizationCode(
    code: string,
    redirectUri?: string,
  ): Promise<any> {
    try {
      this.logger.log('Validating authorization code');

      const body: Record<string, string> = { code };
      if (redirectUri) body.redirectUri = redirectUri;

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/validate/code`,
          body,
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
        error.response?.data?.message ??
          'Failed to validate authorization code',
        error.response?.status ?? 500,
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
        error.response?.data?.message ?? 'Failed to get user information',
        error.response?.status ?? 500,
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
    userMetadata?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ): Promise<any> {
    try {
      this.logger.log(`Authenticating user: ${username}`);

      const requestBody: any = { username, password };

      if (userMetadata) {
        requestBody.userMetadata = userMetadata;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/login/custom`,
          requestBody,
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
        error.response?.data?.message ?? 'Authentication failed',
        error.response?.status ?? 500,
      );
    }
  }

  /**
   * Complete new password challenge
   * @param challengeData Challenge completion data
   * @returns Authentication result with tokens
   */
  async completeNewPasswordChallenge(challengeData: {
    username: string;
    newPassword: string;
    session: string;
  }): Promise<any> {
    try {
      this.logger.log(
        `Completing new password challenge for user: ${challengeData.username}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/complete-new-password-challenge`,
          challengeData,
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
        `Error completing new password challenge: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data?.message ??
          'Failed to complete password challenge',
        error.response?.status ?? 500,
      );
    }
  }

  /**
   * Create a new custom user in the Auth Microservice
   * @param userData User information; when skipWelcomeEmail is true, no welcome/confirmation email is sent
   * @returns Created user response
   */
  async createUser(userData: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    emailConfig?: {
      sender_email: string;
      sender_name: string;
      welcome_subject: string;
      app_name: string;
      app_url: string;
      support_email: string;
      logo_url: string;
      welcome_html_template: string;
    };
    skipWelcomeEmail?: boolean;
  }): Promise<any> {
    try {
      this.logger.log(`Creating user: ${userData.username}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/register`,
          userData,
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
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data?.message ?? 'User creation failed',
        error.response?.status ?? 500,
      );
    }
  }

  /**
   * Start the Center (email OTP) sign-in challenge.
   * @param email Normalised PRMS email — used as Cognito `username`.
   * @description POST {MS_AUTH_URL}/auth/login/otp/start (OTP-T-5, design.md §4.2, §5.1).
   * Never logs the email (OTP-R-11, .cursorrules).
   */
  async startEmailOtp(email: string): Promise<{
    challengeName?: string;
    session: string;
    codeDeliveryDestination?: string;
  }> {
    try {
      this.logger.log('Starting email OTP challenge');

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/login/otp/start`,
          { username: email },
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
      this.logger.error('Error starting email OTP challenge');
      throw new HttpException(
        {
          code: error.response?.data?.code ?? 'UPSTREAM_ERROR',
          message: error.response?.data?.message ?? 'Failed to start email OTP',
        },
        error.response?.status ?? 502,
      );
    }
  }

  /**
   * Verify the Center (email OTP) sign-in challenge.
   * @param email Normalised PRMS email — used as Cognito `username`.
   * @param code The one-time code the user submitted.
   * @param session The session returned by `startEmailOtp` (real or decoy).
   * @description POST {MS_AUTH_URL}/auth/login/otp/verify (OTP-T-5, design.md §4.2, §5.1).
   * Never logs the code, session or email (OTP-R-11, .cursorrules).
   */
  async verifyEmailOtp(
    email: string,
    code: string,
    session: string,
  ): Promise<{ tokens: any }> {
    try {
      this.logger.log('Verifying email OTP challenge');

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMicroserviceUrl}/auth/login/otp/verify`,
          { username: email, code, session },
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
      this.logger.error('Error verifying email OTP challenge');
      throw new HttpException(
        {
          code: error.response?.data?.code ?? 'UPSTREAM_ERROR',
          message:
            error.response?.data?.message ?? 'Failed to verify email OTP',
        },
        error.response?.status ?? 502,
      );
    }
  }
}
