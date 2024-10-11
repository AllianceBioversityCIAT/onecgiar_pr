import { Injectable, HttpStatus, Logger } from '@nestjs/common';
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
  ) {
    this.pusher = new Pusher({
      appId: `${env.PUSHER_APP_ID}`,
      key: `${env.PUSHER_API_KEY}`,
      secret: `${env.PUSHER_API_SECRET}`,
      cluster: `${env.PUSHER_APP_CLUSTER}`,
      useTLS: true,
    });
  }
  create(createAuthDto: CreateAuthDto) {
    return createAuthDto;
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
      const user: User = await this._customUserRepository.findOne({
        where: {
          email: userLogin.email,
          active: true,
        },
      });
      let valid: any;
      if (user) {
        const { email, first_name, last_name, is_cgiar, id } = <
          FullUserRequestDto
        >user;
        if (is_cgiar) {
          const { response, message, status }: any = await this.validateAD(
            email,
            userLogin.password,
          );
          if (!response.valid) {
            throw {
              response,
              message,
              status,
            };
          }
          valid = response.valid;
        } else {
          valid = this._bcryptPasswordEncoder.matches(
            user.password,
            userLogin.password,
          );
        }

        if (valid) {
          await this._userRepository.updateLastLoginUserByEmail(
            userLogin.email,
          );
          return {
            message: 'Successful login',
            response: {
              valid: true,
              token: this._jwtService.sign(
                { id, email, first_name, last_name },
                { secret: env.JWT_SKEY },
              ),
              user: {
                id: user.id,
                user_name: `${user.first_name} ${user.last_name}`,
                email: user.email,
              },
            },
            status: HttpStatus.ACCEPTED,
          };
        } else {
          throw {
            response: {
              valid: false,
            },
            message: 'Invalid credentials',
            status: HttpStatus.UNAUTHORIZED,
          };
        }
      } else {
        throw {
          message: `The user ${userLogin.email} is not registered in the PRMS Reporting database.`,
          response: {
            valid: false,
          },
          status: HttpStatus.NOT_FOUND,
        };
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  validateAD(email, password) {
    //!INFO: this is the original code. remove the import above and uncomment this one to revert to the original code
    //const ActiveDirectory = require('activedirectory');
    const ad = new ActiveDirectory(config.active_directory);

    return new Promise((resolve, reject) => {
      this._logger.log(`Validation with the active directory`);
      ad.authenticate(email, password, (err, auth) => {
        try {
          if (auth) {
            this._logger.verbose(`Successful validation`);
            return resolve({
              response: {
                valid: !!auth,
              },
              message: 'Successful validation',
              status: HttpStatus.ACCEPTED,
            });
          }
          if (err) {
            if (err?.errno) {
              throw {
                response: {
                  valid: false,
                  error: err.errno,
                  code: err.code,
                },
                message: 'Error with communication with third party servers',
                status: HttpStatus.UNAUTHORIZED,
              };
            } else {
              const error: string = err.lde_message.split(/:|,/)[2].trim();
              this._logger.error(`Error: ${error}`);
              switch (error) {
                case 'DSID-0C090447':
                  throw {
                    response: {
                      valid: false,
                      error: err.errno,
                      code: err.code,
                    },
                    message:
                      'Invalid credentials. If you are a CGIAR user, remember to use the password you use for accessing the CGIAR organizational account.',
                    status: HttpStatus.UNAUTHORIZED,
                  };
                  break;
                default:
                  throw {
                    response: {
                      valid: false,
                    },
                    message:
                      'Invalid credentials. If you are a CGIAR user, remember to use the password you use for accessing the CGIAR organizational account.',
                    status: HttpStatus.UNAUTHORIZED,
                  };
                  break;
              }
            }
          } else {
            throw {
              response: {
                valid: false,
                error: err,
              },
              message: 'Unknown error',
              status: HttpStatus.UNAUTHORIZED,
            };
          }
        } catch (error) {
          return {
            response: {
              valid: false,
              error: error,
            },
            message:
              'Invalid credentials. If you are a CGIAR user, remember to use the password you use for accessing the CGIAR organizational account.',
            status: HttpStatus.UNAUTHORIZED,
          };
        }
      });
    });
  }
}
