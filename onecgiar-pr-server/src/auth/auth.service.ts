import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { UserLoginDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { env } from 'process';
import { UserService } from './modules/user/user.service';
import { UserRepository } from './modules/user/repositories/user.repository';
import { HandlersError } from '../shared/handlers/error.utils';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import Pusher from 'pusher';
import { AuthMicroserviceService } from '../shared/microservices/auth-microservice/auth-microservice.service';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { CompletePasswordChallengeDto } from './dto/complete-password-challenge.dto';

@Injectable()
export class AuthService {
  private readonly _logger: Logger = new Logger(AuthService.name);
  private readonly pusher: Pusher;

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _userService: UserService,
    private readonly _userRepository: UserRepository,
    private readonly _handlersError: HandlersError,
    private readonly _authMicroservice: AuthMicroserviceService,
  ) {
    this.pusher = new Pusher({
      appId: `${env.PUSHER_APP_ID}`,
      key: `${env.PUSHER_API_KEY}`,
      secret: `${env.PUSHER_API_SECRET}`,
      cluster: `${env.PUSHER_APP_CLUSTER}`,
      useTLS: true,
    });
  }

  async pusherAuth(
    pusherAuthDot: PusherAuthDot,
    resultId: number,
    userId: number,
  ) {
    try {
      const uPusher = await this._userRepository.userDataPusher(
        userId,
        resultId,
      );

      const today = new Date();
      const roles = uPusher.aplication_role;
      const initiativeRoles = uPusher?.initiative_role ? '1' : null;
      const socketId = pusherAuthDot.socket_id;
      const channel = pusherAuthDot.channel_name;
      const name = `${uPusher.first_name} ${uPusher.last_name}`;

      const presenceData = {
        user_id: `${uPusher.user_id}`,
        user_info: { name, roles, initiativeRoles, today },
      };

      const auth = this.pusher.authenticate(socketId, channel, presenceData);

      return {
        auth,
      };
    } catch (error) {
      return error;
    }
  }

  /**
   * Sign In
   * @param userLogin
   * @returns JWT token and user information OR password challenge
   * @description This method handles the sign-in process for users with automatic user creation if needed.
   * Also handles NEW_PASSWORD_REQUIRED challenge for first-time logins.
   */
  async singIn(userLogin: UserLoginDto): Promise<any> {
    try {
      if (!(userLogin.email && userLogin.password)) {
        throw {
          message: 'Missing required fields: email or password.',
          response: {
            valid: false,
          },
          status: HttpStatus.BAD_REQUEST,
        };
      }

      userLogin.email = userLogin.email.trim().toLowerCase();

      try {
        const existingUser = await this._userRepository.findOne({
          where: {
            email: userLogin.email,
            active: true,
          },
          relations: ['obj_role_by_user'],
        });

        let userMetadata = null;
        if (existingUser) {
          userMetadata = {
            firstName: existingUser.first_name,
            lastName: existingUser.last_name,
            email: existingUser.email,
          };
          this._logger.log(
            `User found locally: ${userLogin.email}. Sending metadata to auth microservice.`,
          );
        } else if (existingUser.active === false) {
          this._logger.log(
            `User found locally but inactive: ${userLogin.email}. Cannot proceed.`,
          );
          return {
            message:
              'User found but inactive. Please contact the support team.',
            status: HttpStatus.FORBIDDEN,
            response: {
              valid: false,
            },
          };
        } else {
          this._logger.log(
            `User not found locally: ${userLogin.email}. Cannot proceed without local user record.`,
          );
          return {
            message:
              'User not found in local database. Please contact the support team.',
            status: HttpStatus.NOT_FOUND,
            response: {
              valid: false,
            },
          };
        }

        const authResponse =
          await this._authMicroservice.authenticateWithCustomCredentials(
            userLogin.email,
            userLogin.password,
            userMetadata,
          );

        if (authResponse?.challengeName === 'NEW_PASSWORD_REQUIRED') {
          this._logger.log(
            `User ${userLogin.email} needs to set a new password (first login)`,
          );

          return {
            message: 'Password change required. Please set a new password.',
            response: {
              valid: false,
              challengeRequired: true,
              challengeName: 'NEW_PASSWORD_REQUIRED',
              session: authResponse.session,
              userAttributes: authResponse.userAttributes,
              userId: authResponse.userId,

              localUser: {
                id: existingUser.id,
                email: existingUser.email,
                firstName: existingUser.first_name,
                lastName: existingUser.last_name,
              },
            },
            status: HttpStatus.ACCEPTED,
          };
        }

        if (!authResponse.tokens) {
          throw new Error(
            'Invalid authentication response from Auth Microservice',
          );
        }

        await this._userRepository.updateLastLoginUserByEmail(userLogin.email);
        this._logger.log(`Updated last login for user: ${userLogin.email}`);

        return this.createSuccessfulLoginResponse(
          existingUser,
          authResponse.tokens,
        );
      } catch (error) {
        this._logger.error(
          `Authentication error for ${userLogin.email}: ${error.message}`,
          error.stack,
        );

        if (error.response?.data?.challengeName === 'NEW_PASSWORD_REQUIRED') {
          return {
            message: 'Password change required',
            response: {
              valid: false,
              challengeRequired: true,
              challengeName: 'NEW_PASSWORD_REQUIRED',
              session: error.response.data.session,
              userAttributes: error.response.data.userAttributes,
            },
            status: HttpStatus.ACCEPTED,
          };
        }

        if (error.status === HttpStatus.UNAUTHORIZED) {
          return {
            response: {
              valid: false,
            },
            message: error.message ?? 'Invalid credentials',
            status: HttpStatus.UNAUTHORIZED,
          };
        }

        return {
          response: {
            valid: false,
          },
          message: error.message ?? 'Authentication failed',
          status: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }
    } catch (error) {
      this._logger.error(
        `Unexpected error in singIn: ${error.message}`,
        error.stack,
      );
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Get Auth URL
   * @param provider
   * @returns Authentication URL for the specified provider
   * @description This method generates an authentication URL for the specified OAuth provider.
   */
  async getAuthURL(provider: string): Promise<any> {
    try {
      this._logger.log(`Getting authentication URL for provider: ${provider}`);

      const response =
        await this._authMicroservice.getAuthenticationUrl(provider);

      return {
        message: 'Authentication URL generated successfully',
        response: response,
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(
        `Error getting authentication URL: ${error.message}`,
        error.stack,
      );
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Validate Code Auth
   * @param authCodeDto
   * @returns User information and JWT token
   * @description Validates the authorization code received from the OAuth provider and retrieves user information.
   */
  async validateAuthCode(authCodeDto: AuthCodeValidationDto): Promise<any> {
    try {
      this._logger.log('Validando código de autorización');

      const authResponse =
        await this._authMicroservice.validateAuthorizationCode(
          authCodeDto.code,
        );

      const userInfo = authResponse.userInfo;

      if (!userInfo?.email) {
        throw {
          message: 'The user does not have an email address.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const user =
        await this._userService.createOrUpdateUserFromAuthProvider(userInfo);

      await this._userRepository.update(
        {
          id: user.id,
          email: user.email,
        },
        {
          last_login: new Date(),
        },
      );

      const authTokens = {
        accessToken: authResponse.accessToken,
        idToken: authResponse.idToken,
        refreshToken: authResponse.refreshToken,
        expiresIn: authResponse.expiresIn,
      };

      return this.createSuccessfulLoginResponse(user, authTokens);
    } catch (error) {
      this._logger.error(`An error ocurred: ${error.message}`, error.stack);
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Complete Password Challenge
   * @param challengeDto Challenge completion data
   * @returns JWT token and user information after successful password set
   */
  async completePasswordChallenge(
    challengeDto: CompletePasswordChallengeDto,
  ): Promise<any> {
    try {
      this._logger.log(
        `Completing password challenge for user: ${challengeDto.username}`,
      );

      const existingUser = await this._userRepository.findOne({
        where: {
          email: challengeDto.username.trim().toLowerCase(),
          active: true,
        },
        relations: ['obj_role_by_user'],
      });

      if (!existingUser) {
        throw {
          message: 'User not found in local database',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const authResponse =
        await this._authMicroservice.completeNewPasswordChallenge({
          username: challengeDto.username,
          newPassword: challengeDto.newPassword,
          session: challengeDto.session,
        });

      if (!authResponse.tokens) {
        throw new Error(
          'Invalid response from Auth Microservice - no tokens received',
        );
      }

      await this._userRepository.updateLastLoginUserByEmail(
        challengeDto.username,
      );

      return this.createSuccessfulLoginResponse(
        existingUser,
        authResponse.tokens,
        'Password set successfully. Login completed.',
      );
    } catch (error) {
      this._logger.error(
        `Error completing password challenge: ${error.message}`,
        error.stack,
      );
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Creates JWT token and success response for authenticated user
   * @param user User entity
   * @param authTokens Authentication tokens from auth microservice
   * @param successMessage Custom success message
   * @returns Successful login response object
   */
  private createSuccessfulLoginResponse(
    user: any,
    authTokens: any,
    successMessage: string = 'Successful login',
  ) {
    if (!user.obj_role_by_user || user.obj_role_by_user.length === 0) {
      this._logger.warn(`User ${user.email} has no roles assigned`);
      return {
        message: `The user ${user.email} does not have any roles assigned. Please contact the administrator.`,
        response: {
          valid: false,
          needsRoles: true,
        },
        status: HttpStatus.FORBIDDEN,
      };
    }

    const jwtToken = this._jwtService.sign(
      {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      {
        secret: env.JWT_SKEY,
      },
    );

    return {
      message: successMessage,
      response: {
        valid: true,
        token: jwtToken,
        user: {
          id: user.id,
          user_name: `${user.first_name} ${user.last_name}`,
          user_acronym: user.first_name.charAt(0) + user.last_name.charAt(0),
          email: user.email,
        },
        auth_tokens: authTokens,
      },
      status: HttpStatus.OK,
    };
  }
}
