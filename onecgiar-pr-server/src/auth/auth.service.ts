import {
  Injectable,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UserLoginDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { BcryptPasswordEncoder } from './utils/bcrypt.util';
import { env } from 'process';
import config from '../config/const.config';
import { UserService } from './modules/user/user.service';
import { UserRepository } from './modules/user/repositories/user.repository';
import { FullUserRequestDto } from './modules/user/dto/full-user-request.dto';
import { User } from './modules/user/entities/user.entity';
import { HandlersError } from '../shared/handlers/error.utils';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import Pusher from 'pusher';
import ActiveDirectory from 'activedirectory';
import { AuthMicroserviceService } from '../shared/microservices/auth-microservice/auth-microservice.service';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';

@Injectable()
export class AuthService {
  private readonly _logger: Logger = new Logger(AuthService.name);
  private readonly pusher: Pusher;

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _userService: UserService,
    private readonly _userRepository: UserRepository,
    private readonly _bcryptPasswordEncoder: BcryptPasswordEncoder,
    private readonly _customUserRepository: UserRepository,
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
   * @returns JWT token and user information
   * @description This method handles the sign-in process for users.
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
        const authResponse =
          await this._authMicroservice.authenticateWithCustomCredentials(
            userLogin.email,
            userLogin.password,
          );

        const userInfo = authResponse.userInfo;

        const user =
          await this._userService.createOrUpdateUserFromAuthProvider(userInfo);

        await this._userRepository.updateLastLoginUserByEmail(userLogin.email);

        const jwtToken = this._jwtService.sign(
          {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          { secret: env.JWT_SKEY },
        );

        return {
          message: 'Successful login',
          response: {
            valid: true,
            token: jwtToken,
            user: {
              id: user.id,
              user_name: `${user.first_name} ${user.last_name}`,
              email: user.email,
            },
            auth_tokens: authResponse.tokens,
          },
          status: HttpStatus.ACCEPTED,
        };
      } catch (error) {
        const user = await this._userRepository.findOne({
          where: {
            email: userLogin.email,
            active: true,
          },
        });

        if (!user) {
          throw {
            message: `The user ${userLogin.email} is not registered in the system.`,
            response: {
              valid: false,
            },
            status: HttpStatus.NOT_FOUND,
          };
        }

        throw {
          response: {
            valid: false,
          },
          message: error.message || 'Authentication failed',
          status: error.status || HttpStatus.UNAUTHORIZED,
        };
      }
    } catch (error) {
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

      if (!userInfo || !userInfo.email) {
        throw {
          message: 'The user does not have an email address.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const user =
        await this._userService.createOrUpdateUserFromAuthProvider(userInfo);

      if (!user.obj_role_by_user || user.obj_role_by_user.length === 0) {
        throw {
          message: `The user ${user.email} does not have rol associate.`,
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      const jwtToken = this._jwtService.sign(
        {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        { secret: env.JWT_SKEY },
      );

      await this._userRepository.updateLastLoginUserByEmail(user.email);

      return {
        message: 'Successful login',
        response: {
          valid: true,
          token: jwtToken,
          auth_tokens: {
            accessToken: authResponse.accessToken,
            idToken: authResponse.idToken,
            refreshToken: authResponse.refreshToken,
            expiresIn: authResponse.expiresIn,
          },
          user: {
            id: user.id,
            user_name: `${user.first_name} ${user.last_name}`,
            email: user.email,
          },
        },
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(`An error ocurred: ${error.message}`, error.stack);
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
