import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
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

@Injectable()
export class AuthService {
  private readonly _logger: Logger = new Logger(AuthService.name);

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _userService: UserService,
    private readonly _bcryptPasswordEncoder: BcryptPasswordEncoder,
    private readonly _customUserRepository: UserRepository,
    private readonly _handlersError: HandlersError,
  ) { }
  create(createAuthDto: CreateAuthDto) {
    return createAuthDto;
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth ${updateAuthDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
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
        where: { email: userLogin.email },
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
          return {
            message: 'Successful login',
            response: {
              valid: true,
              token: this._jwtService.sign(
                { id, email, first_name, last_name },
                { secret: env.JWT_SKEY, expiresIn: env.JWT_EXPIRES },
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
            message: 'Password does not match',
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
    const ActiveDirectory = require('activedirectory');
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
                status: HttpStatus.INTERNAL_SERVER_ERROR,
              };
            } else {
              const error: string = err.lde_message.split(/:|,/)[2].trim();
              switch (error) {
                case 'DSID-0C090447':
                  throw {
                    response: {
                      valid: false,
                      error: err.errno,
                      code: err.code,
                    },
                    message: 'Password does not match',
                    status: HttpStatus.UNAUTHORIZED,
                  };
                  break;
                default:
                  throw {
                    response: {
                      valid: false,
                    },
                    message: 'Unknown error in validation',
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
              status: HttpStatus.INTERNAL_SERVER_ERROR,
            };
          }
        } catch (error) {
          return reject(this._handlersError.returnErrorRes({ error }));
        }
      });
    });
  }
}
