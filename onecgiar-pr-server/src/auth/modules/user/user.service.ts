import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { returnFormatUser } from './dto/return-create-user.dto';
import { UserRepository } from './repositories/user.repository';
import { BcryptPasswordEncoder } from '../../utils/bcrypt.util';
import { RoleByUserRepository } from '../role-by-user/RoleByUser.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';

@Injectable()
export class UserService {
  private readonly cgiarRegex: RegExp = /@cgiar\.org/gi;

  constructor(
    @InjectRepository(User)
    private readonly _userRepository: Repository<User>,
    private readonly _customUserRespository: UserRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _bcryptPasswordEncoder: BcryptPasswordEncoder,
    private readonly _handlersError: HandlersError,
  ) {}

  create(createUserDto: CreateUserDto) {
    return createUserDto;
  }

  async createFull(
    createUserDto: CreateUserDto,
    role: number,
    token: TokenDto,
  ): Promise<returnFormatUser | returnErrorDto> {
    try {
      createUserDto.is_cgiar =
        createUserDto.email.search(this.cgiarRegex) > -1 ? true : false;
      const user = await this.findOneByEmail(createUserDto.email);
      if (user.response) {
        throw {
          response: {},
          message: 'Duplicates have been found in the data',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!createUserDto.is_cgiar) {
        if (!('password' in createUserDto)) {
          if (!createUserDto['password']) {
            throw {
              response: {},
              message: 'No password provider',
              status: HttpStatus.BAD_REQUEST,
            };
          }
        }
      }

      if (!role) {
        throw {
          response: {},
          message: 'No role provider',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      createUserDto.password = createUserDto.is_cgiar
        ? null
        : this._bcryptPasswordEncoder.encode(createUserDto.password.toString());
      const createdBy: User = await this._userRepository.findOne({
        where: { id: token.id },
      });
      createUserDto.created_by = createdBy ? createdBy.id : null;
      createUserDto.last_updated_by = createdBy ? createdBy.id : null;

      const newUser: User = await this._userRepository.save(createUserDto);
      await this._roleByUserRepository.save({
        role: role,
        user: newUser.id,
        created_by: createdBy ? createdBy.id : null,
        last_updated_by: createdBy ? createdBy.id : null,
      });

      return {
        response: {
          id: newUser.id,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
        } as User,
        message: 'User successfully created',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findAll(): Promise<returnFormatUser | returnErrorDto> {
    try {
      const user: User[] = await this._userRepository.find({
        select: [
          'id',
          'first_name',
          'last_name',
          'email',
          'is_cgiar',
          'last_login',
          'active',
          'created_by',
          'created_date',
          'last_updated_by',
          'last_updated_date',
        ],
      });
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOne(id: number): Promise<returnFormatUser | returnErrorDto> {
    try {
      const user: User = await this._userRepository.findOne({
        where: { id: id },
      });

      if (!user) {
        throw {
          response: {},
          message: 'User Not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOneByEmail(
    email: string,
  ): Promise<returnFormatUser | returnErrorDto> {
    try {
      const user: User = await this._customUserRespository.findOne({
        where: { email: email },
      });
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findInitiativeByUserId(
    userId: number,
  ): Promise<returnErrorDto | returnFormatUser> {
    try {
      const initiativeByUser =
        await this._customUserRespository.InitiativeByUser(userId);

      return {
        response: initiativeByUser,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
