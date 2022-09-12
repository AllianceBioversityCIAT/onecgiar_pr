import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly _jwtService: JwtService,
    private readonly _userService: UserService,
    private readonly _bcryptPasswordEncoder: BcryptPasswordEncoder,
    private readonly _customUserRepository: UserRepository,
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

  async singIn(userLogin: UserLoginDto): Promise<velidUserInterface> {
    try {
      if (!(userLogin.email && userLogin.password)) {
        throw new HttpException(
          'Missing required fields: email or password.',
          HttpStatus.BAD_REQUEST,
        );
      }
      userLogin.email = userLogin.email.trim().toLowerCase();
      const user: any = await this._customUserRepository.completeDataByEmail(
        userLogin.email,
      );
      let valid;
      if (user) {
        const { email, first_name, last_name, is_cgiar } = <FullUserRequestDto>(
          user
        );
        if (is_cgiar) {
          valid = await this.validateAD(email, userLogin.password);
        } else {
          valid = this._bcryptPasswordEncoder.matches(
            user.password,
            userLogin.password,
          );
        }

        if (valid == true) {
          return {
            validate: valid,
            token: this._jwtService.sign(
              { email, first_name, last_name },
              { secret: env.JWT_SKEY, expiresIn: env.JWT_EXPIRES },
            ),
            user: user,
            code: HttpStatus.ACCEPTED,
          };
        } else {
          throw 'Invalid credentials';
        }
      }
    } catch (error) {
      return {
        validate: false,
        token: null,
        user: null,
        code: HttpStatus.BAD_REQUEST,
      };
    }
  }

  validateAD(email, password) {
    const ActiveDirectory = require('activedirectory');
    const ad = new ActiveDirectory(config.active_directory);

    return new Promise((resolve, reject) => {
      ad.authenticate(email, password, (err, auth) => {
        try {
          if (auth) {
            console.log('Authenticated AD!', JSON.stringify(auth));
            return resolve(auth);
          }
          if (err) {
            console.log('ERROR AUTH: ' + JSON.stringify(err));
            const notFound = {
              name: 'SERVER_NOT_FOUND',
              description: `There was an internal server error: ${err.lde_message}`,
              httpCode: 400,
            };
            if (err.errno == 'ENOTFOUND') {
              notFound.name = 'SERVER_NOT_FOUND';
              notFound.description = 'Server not found';
            }

            return reject(notFound);
          } else {
            console.log('Authentication failed!');
            const err = {
              name: 'INVALID_CREDENTIALS',
              description: 'The supplied credential is invalid',
              httpCode: 400,
            };

            console.log('ERROR: ' + JSON.stringify(err));
            return reject(err);
          }
        } catch (error) {}
      });
    });
  }
}
