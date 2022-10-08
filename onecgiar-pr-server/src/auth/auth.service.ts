import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
import { returnFormatSingin } from './dto/return-fromat-singin.dto';
import { User } from './modules/user/entities/user.entity';
import { HandlersError, returnErrorDto } from '../shared/handlers/error.utils';

@Injectable()
export class AuthService {

  private readonly _logger: Logger = new Logger(AuthService.name);

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _userService: UserService,
    private readonly _bcryptPasswordEncoder: BcryptPasswordEncoder,
    private readonly _customUserRepository: UserRepository,
    private readonly _handlersError: HandlersError
  ) {}
  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }

  async singIn(userLogin: UserLoginDto): Promise<any> {
    try {
      if (!(userLogin.email && userLogin.password)) {
        throw {
            message:'Missing required fields: email or password.',
            response:{
              valid: false
            },
            status: HttpStatus.BAD_REQUEST
        }
      }
      userLogin.email = userLogin.email.trim().toLowerCase();
      const user: User = await this._customUserRepository.findOne({where: {email: userLogin.email}});
      let valid: any;
      if (user) {
        const { email, first_name, last_name, is_cgiar, id } = <FullUserRequestDto>(
          user
        );
        if (is_cgiar) {
          const {response, message, status}: any = await this.validateAD(email, userLogin.password);
          if(!response.valid){
            throw {
              response,
              message,
              status
            }
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
                { id, email, first_name, last_name},
                { secret: env.JWT_SKEY, expiresIn: env.JWT_EXPIRES },
              ),
              user: {id:user.id, user_name:`${user.first_name} ${user.last_name}`, email:user.email}
            },
            status: HttpStatus.ACCEPTED
          }
        } else {
          throw {
            message: 'INVALID_CREDENTIALS',
            response: {
              valid: false
            },
            status: HttpStatus.BAD_REQUEST
          };
        }
      }else{
        throw {
          message: 'INVALID_CREDENTIALS',
          response: {
            valid: false
          },
          status: HttpStatus.BAD_REQUEST
        };
      }
    } catch (error) {
      return  this._handlersError.returnErrorRes({error});
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
                valid: !!auth
              },
              message: 'Successful validation',
              status: HttpStatus.ACCEPTED
            });
          }
          if (err) {
            throw {
              response: {
                valid: false,
                error: err
              },
              message: err.lde_message,
              status: HttpStatus.UNAUTHORIZED
            }
          } else {
            throw {
              response: {
                valid: false,
                error: err
              },
              message: err.lde_message,
              status: HttpStatus.UNAUTHORIZED
            }
          }
        } catch (error) {
          return reject(this._handlersError.returnErrorRes({error}));
        }
      });
    });
  }
}
