import { Injectable, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
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
import { Brackets } from 'typeorm';

@Injectable()
export class UserService {
  private readonly cgiarRegex: RegExp = /@cgiar\.org/gi;

  constructor(
    @InjectRepository(User)
    private readonly _userRepository: UserRepository,
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
        createUserDto.email.search(this.cgiarRegex) > -1;
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

  async getAllUsers() {
    try {
      const query =
      ` SELECT  
        first_name AS "firstName",
        last_name AS "lastName",
        email AS "emailAddress",
        CASE 
            WHEN is_cgiar = 1 THEN 'Yes'
            ELSE 'No'
        END AS "cgIAR",
        CASE 
            WHEN active = 1 THEN 'Active'
            ELSE 'Inactive'
        END AS "userStatus",
        created_date AS "userCreationDate"
      FROM 
        users
      ORDER BY 
        created_date DESC;`
    ;
    const user: User[] = await this._userRepository.query(query);
    return {
      response: user,
      message: 'Successful response',
      status: HttpStatus.OK,
    };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async searchUsers(filters: {
    user?: string;
    cgIAR?: 'Yes' | 'No';
    status?: 'Active' | 'Inactive';
  }) {

  try{
    const { user, cgIAR, status } = filters;
    const query = this._userRepository.createQueryBuilder('users');
    query.select([
      'users.first_name AS "firstName"',
      'users.last_name AS "lastName"',
      'users.email AS "emailAddress"',
      `CASE WHEN users.is_cgiar = 1 THEN 'Yes' ELSE 'No' END AS "cgIAR"`,
      `CASE WHEN users.active = 1 THEN 'Active' ELSE 'Inactive' END AS "userStatus"`,
      'users.created_date AS "userCreationDate"',
    ]);

    query.where('1 = 1');

    if (user && user.trim() !== '') {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('users.first_name LIKE :searchTerm', { searchTerm: `%${user}%` })
            .orWhere('users.last_name LIKE :searchTerm', { searchTerm: `%${user}%` })
            .orWhere('users.email LIKE :searchTerm', { searchTerm: `%${user}%` });

          const yearRegex = /^\d{4}$/;
          const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
          const fullDateRegex = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

          if (fullDateRegex.test(user)) {
            qb.orWhere('DATE(users.created_date) = :dateCondition', { dateCondition: user });
          } else if (yearMonthRegex.test(user)) {
            const [year, month] = user.split('-').map(Number);
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            qb.orWhere('users.created_date BETWEEN :startDate AND :endDate', {
              startDate: startDate + ' 00:00:00',
              endDate: endDate + ' 23:59:59',
            });
          } else if (yearRegex.test(user)) {
            const startDate = `${user}-01-01`;
            const endDate = `${user}-12-31`;

            qb.orWhere('users.created_date BETWEEN :startDate AND :endDate', {
              startDate: startDate + ' 00:00:00',
              endDate: endDate + ' 23:59:59',
            });
          }
        })
      );
    }

    if (cgIAR) {
      query.andWhere('users.is_cgiar = :isCgiar', {
        isCgiar: cgIAR.toLowerCase() === 'yes' ? 1 : 0,
      });
    }

    if (status) {
      query.andWhere('users.active = :activeStatus', {
        activeStatus: status.toLowerCase() === 'active' ? 1 : 0,
      });
    }

    query.orderBy('users.created_date', 'DESC');

    const users: User[] = await query.getRawMany();
    console.log('Query result:', users);

    if (users.length === 0) {
      return {
        response: [],
        message: 'No users match the entered criteria',
        status: HttpStatus.NOT_FOUND,
      };
    }
    return {
      response: users,
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
        throw new HttpException('User Not found', HttpStatus.NOT_FOUND);
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

  async lastPopUpViewed(
    userId: number,
  ): Promise<returnErrorDto | returnFormatUser> {
    try {
      const user: User = await this._userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw {
          response: {},
          message: 'User Not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      user.last_updated_by = user.id;
      await this._userRepository.save(user);

      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Create or update user based on information from the authentication microservice
   * @param userInfo User information from the microservice
   * @returns Created or updated user
   */
  async createOrUpdateUserFromAuthProvider(userInfo: any): Promise<User> {
    const logger = new Logger('createOrUpdateUserFromAuthProvider');

    try {
      if (!userInfo || !userInfo.email) {
        throw new Error('Invalid user information in auth response');
      }

      const email = userInfo.email.toLowerCase().trim();

      logger.log(`Checking if user exists: ${email}`);
      const user = await this._userRepository.findOne({
        where: { email, active: true },
        relations: ['obj_role_by_user'],
      });

      if (user) {
        logger.log(`User found in database: ${email}`);
        await this._userRepository.update(
          {
            id: user.id,
            email: user.email,
          },
          {
            last_login: new Date(),
          },
        );
        return user;
      }

      logger.log(`Creating new user from authentication provider: ${email}`);
      const newUser = new User();
      newUser.email = email;
      newUser.first_name =
        userInfo.given_name ?? userInfo.name?.split(' ')[0] ?? 'User';
      newUser.last_name =
        userInfo.family_name ??
        userInfo.name?.split(' ').slice(1).join(' ') ??
        '';
      newUser.is_cgiar = email.endsWith('@cgiar.org');
      newUser.active = true;

      const savedUser = await this._userRepository.save(newUser);
      logger.log(`User created: ${email} (ID: ${savedUser.id})`);

      await this._roleByUserRepository.createGuestRoleForUser(savedUser.id);
      logger.log(`GUEST role assigned to user: ${email}`);

      return this._userRepository.findOne({
        where: { id: savedUser.id },
        relations: ['obj_role_by_user'],
      });
    } catch (error) {
      logger.error(
        `Error creating/updating user: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to create or update user: ${error.message}`);
    }
  }
}
