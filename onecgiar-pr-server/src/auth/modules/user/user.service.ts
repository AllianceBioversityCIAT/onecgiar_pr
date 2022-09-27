import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository, JoinColumn } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../role/entities/role.entity';
import { RoleService } from '../role/role.service';
import { retunrFormatUser } from './dto/return-create-user.dto';
import { UserRepository } from './repositories/user.repository';
import { FullUserRequestDto } from './dto/full-user-request.dto';
import { BcryptPasswordEncoder } from '../../utils/bcrypt.util'
import { RoleByUserRepository } from '../role-by-user/RoleByUser.repository';
import { RoleByUser } from '../role-by-user/entities/role-by-user.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Injectable()
export class UserService {
  private readonly cgiarRegex: RegExp = /cgiar\.org/g;

  constructor(
    @InjectRepository(User)
    private readonly _userRepository: Repository<User>,
    private readonly _customUserRespository: UserRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _bcryptPasswordEncoder: BcryptPasswordEncoder,
  ) {}

  create(createUserDto: CreateUserDto) {
    return createUserDto;
  }

  async createFull(
    createUserDto: CreateUserDto,
    role: number,
    token: TokenDto
  ): Promise<retunrFormatUser> {
    try {
      createUserDto.is_cgiar = this.cgiarRegex.test(createUserDto.email);
      const user = await this.findOneByEmail(createUserDto.email);
      if (user.response) {
        throw {
            response: {},
            message: 'Duplicates have been found in the data',
            status: HttpStatus.BAD_REQUEST
          }
      }

      if (!createUserDto.is_cgiar) {
        if (!('password' in createUserDto)) {
          if (!createUserDto.password) {
            throw {
              response: {},
              message: 'No password provider',
              status: HttpStatus.BAD_REQUEST
            }
          }
        }
      }

      createUserDto.password =
      createUserDto.is_cgiar
          ? null
          : this._bcryptPasswordEncoder.encode(
            createUserDto.password.toString(),
            );

      createUserDto.created_by = token.id;
      createUserDto.last_updated_by = token.id;
      
      const newUser: User = await this._userRepository.save(createUserDto);
      const newRole: RoleByUser = await this._roleByUserRepository.save({
        role: role,
        user: newUser.id,
        created_by: token.id,
        last_updated_by: token.id
      })

      return {
        response: {
          id: newUser.id,
          first_name: newUser.first_name,
          last_name: newUser.last_name
        },
        message: 'User successfully created',
        status: HttpStatus.CREATED
      }
    } catch (error) {
      return error;
    }
  }

  async findAll():Promise<retunrFormatUser>  {
    try {
      const user: User[] = await this._userRepository.find();
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'Users not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  async findAllFull():Promise<retunrFormatUser>  {
    try {
      const user: FullUserRequestDto[] = await this._customUserRespository.AllUsers()
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'Users not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  async findOne(id: number):Promise<retunrFormatUser> {
    try {
      const user: User = await this._userRepository.findOne({
        where: { id: id },
      });
      console.log(user);
      
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'User not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  async findOneByEmail(email: string):Promise<retunrFormatUser> {
    try {
      const user: User = await this._userRepository.findOne({
        where: { email: email },
      });
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'User not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  async findInitiativeByUserId(userId: number){
    try {
      const initiativeByUser = await this._customUserRespository.InitiativeByUser(userId);
      return {
        response: initiativeByUser,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'User not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
