import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { BcryptPasswordEncoder } from '../../utils/bcrypt.util';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { UserRepository } from './repositories/user.repository';
import { RoleByUserRepository } from '../role-by-user/RoleByUser.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('UserService', () => {
  let service: UserService;
  let userRepository: UserRepository;
  let customUserRepository: UserRepository;
  let roleByUserRepository: RoleByUserRepository;
  let bcryptPasswordEncoder: BcryptPasswordEncoder;
  let handlersError: HandlersError;

  const mockUser: User = {
    id: 1,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    password: 'hashedpassword123',
    is_cgiar: true,
    active: true,
    created_by: null,
    created_date: new Date(),
    last_updated_by: null,
    last_updated_date: new Date(),
    last_login: new Date(),
    last_pop_up_viewed: null,
    obj_role_by_user: [{ id: 1, role: 3, user: 1, active: true }],
  } as User;

  const mockCgiarUser: User = {
    ...mockUser,
    email: 'test@cgiar.org',
    is_cgiar: true,
  } as User;

  const mockUsers: User[] = [
    mockUser,
    {
      ...mockUser,
      id: 2,
      email: 'another@example.com',
      is_cgiar: false,
    } as User,
  ];

  const mockInitiatives = [
    {
      initiative_id: 1,
      official_code: 'INIT-001',
      initiative_name: 'Climate Initiative',
      short_name: 'CI',
      cgiar_entity_type_id: 'type1',
      obj_cgiar_entity_type: { code: 'type1', name: 'Entity Type 1' },
    },
  ];

  const mockCreateUserDto: CreateUserDto = {
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    password: 'password123',
    is_cgiar: false,
    created_by: 1,
    last_updated_by: 1,
  };

  const mockCreateCgiarUserDto: CreateUserDto = {
    ...mockCreateUserDto,
    email: 'test@cgiar.org',
    is_cgiar: true,
  };

  const mockTokenDto: TokenDto = {
    id: 1,
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
  };

  const mockErrorResponse = {
    response: { error: true },
    message: 'Error message',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  };

  const mockUserRepositoryFactory = jest.fn(() => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    InitiativeByUser: jest.fn(),
    createQueryBuilder: jest.fn(),
  }));

  const mockRoleByUserRepositoryFactory = jest.fn(() => ({
    save: jest.fn(),
    createGuestRoleForUser: jest.fn(),
  }));

  const mockBcryptPasswordEncoderFactory = jest.fn(() => ({
    encode: jest.fn((password) => `hashed_${password}`),
    matches: jest.fn(),
  }));

  const mockHandlersErrorFactory = jest.fn(() => ({
    returnErrorRes: jest.fn((config) => ({
      response: config.error.response || { error: true },
      message: config.error.message || 'Error message',
      status: config.error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    })),
  }));

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useFactory: mockUserRepositoryFactory,
        },
        {
          provide: UserRepository,
          useFactory: mockUserRepositoryFactory,
        },
        {
          provide: RoleByUserRepository,
          useFactory: mockRoleByUserRepositoryFactory,
        },
        {
          provide: BcryptPasswordEncoder,
          useFactory: mockBcryptPasswordEncoderFactory,
        },
        {
          provide: HandlersError,
          useFactory: mockHandlersErrorFactory,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<UserRepository>(getRepositoryToken(User));
    customUserRepository = module.get<UserRepository>(UserRepository);
    roleByUserRepository =
      module.get<RoleByUserRepository>(RoleByUserRepository);
    bcryptPasswordEncoder = module.get<BcryptPasswordEncoder>(
      BcryptPasswordEncoder,
    );
    handlersError = module.get<HandlersError>(HandlersError);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return the user DTO as is', () => {
      const result = service.create(mockCreateUserDto);

      expect(result).toEqual(mockCreateUserDto);
    });
  });

  describe('createFull', () => {
    it('should create a non-CGIAR user with password and role', async () => {
      // Arrange
      const role = 3; // Guest role
      customUserRepository.findOne = jest.fn().mockResolvedValue(null);
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      userRepository.save = jest.fn().mockResolvedValue(mockUser);
      roleByUserRepository.save = jest.fn().mockResolvedValue({
        id: 1,
        role,
        user: mockUser.id,
      });
      bcryptPasswordEncoder.encode = jest
        .fn()
        .mockReturnValue('hashedpassword123');

      // Act
      const result = await service.createFull(
        mockCreateUserDto,
        role,
        mockTokenDto,
      );

      // Assert
      expect(result).toEqual({
        response: {
          id: mockUser.id,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
        },
        message: 'User successfully created',
        status: HttpStatus.CREATED,
      });
      expect(customUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCreateUserDto.email },
      });
      // Corregir esta línea: bcryptPasswordEncoder.encode se llama con la contraseña sin hashear
      expect(bcryptPasswordEncoder.encode).toHaveBeenCalledWith('password123');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTokenDto.id },
      });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockCreateUserDto,
        password: 'hashedpassword123',
        created_by: 1,
        last_updated_by: 1,
      });
      expect(roleByUserRepository.save).toHaveBeenCalledWith({
        role,
        user: mockUser.id,
        created_by: 1,
        last_updated_by: 1,
      });
    });

    it('should create a CGIAR user without password', async () => {
      const role = 3;
      customUserRepository.findOne = jest.fn().mockResolvedValue(null);
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      userRepository.save = jest.fn().mockResolvedValue({
        ...mockCgiarUser,
        password: null,
      });
      roleByUserRepository.save = jest.fn().mockResolvedValue({
        id: 1,
        role,
        user: mockCgiarUser.id,
      });

      const result = await service.createFull(
        mockCreateCgiarUserDto,
        role,
        mockTokenDto,
      );

      expect(result).toEqual({
        response: {
          id: mockCgiarUser.id,
          first_name: mockCgiarUser.first_name,
          last_name: mockCgiarUser.last_name,
        },
        message: 'User successfully created',
        status: HttpStatus.CREATED,
      });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockCreateCgiarUserDto,
        password: null,
        created_by: 1,
        last_updated_by: 1,
      });
    });

    it('should throw an error if user already exists', async () => {
      const role = 3;
      customUserRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      handlersError.returnErrorRes = jest
        .fn()
        .mockReturnValue(mockErrorResponse);

      const result = await service.createFull(
        mockCreateUserDto,
        role,
        mockTokenDto,
      );

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: {
          response: {},
          message: 'Duplicates have been found in the data',
          status: HttpStatus.BAD_REQUEST,
        },
      });
    });

    it('should throw an error if no role provided', async () => {
      const role = null;
      customUserRepository.findOne = jest.fn().mockResolvedValue(null);
      handlersError.returnErrorRes = jest
        .fn()
        .mockReturnValue(mockErrorResponse);

      const result = await service.createFull(
        mockCreateUserDto,
        role,
        mockTokenDto,
      );

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: {
          response: {},
          message: 'No role provider',
          status: HttpStatus.BAD_REQUEST,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      userRepository.find = jest.fn().mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual({
        response: mockUsers,
        message: 'Successful response',
        status: HttpStatus.OK,
      });
      expect(userRepository.find).toHaveBeenCalledWith({
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
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      userRepository.find = jest.fn().mockRejectedValue(error);
      handlersError.returnErrorRes = jest
        .fn()
        .mockReturnValue(mockErrorResponse);

      const result = await service.findAll();

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });

  describe('findOne', () => {
    it('should find a user by ID', async () => {
      const userId = 1;
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(result).toEqual({
        response: mockUser,
        message: 'Successful response',
        status: HttpStatus.OK,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw an error if user not found', async () => {
      const userId = 99;
      userRepository.findOne = jest.fn().mockResolvedValue(null);
      handlersError.returnErrorRes = jest
        .fn()
        .mockReturnValue(mockErrorResponse);

      const result = await service.findOne(userId);

      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('findOneByEmail', () => {
    it('should find a user by email', async () => {
      const email = 'test@example.com';
      customUserRepository.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findOneByEmail(email);

      expect(result).toEqual({
        response: mockUser,
        message: 'Successful response',
        status: HttpStatus.OK,
      });
      expect(customUserRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should handle errors', async () => {
      const email = 'test@example.com';
      const error = new Error('Database error');
      customUserRepository.findOne = jest.fn().mockRejectedValue(error);
      handlersError.returnErrorRes = jest
        .fn()
        .mockReturnValue(mockErrorResponse);

      const result = await service.findOneByEmail(email);

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });

  describe('findInitiativeByUserId', () => {
    it('should find initiatives by user ID', async () => {
      const userId = 1;
      customUserRepository.InitiativeByUser = jest
        .fn()
        .mockResolvedValue(mockInitiatives);

      const result = await service.findInitiativeByUserId(userId);

      expect(result).toEqual({
        response: mockInitiatives,
        message: 'Successful response',
        status: HttpStatus.OK,
      });
      expect(customUserRepository.InitiativeByUser).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should handle errors', async () => {
      const userId = 1;
      const error = new Error('Database error');
      customUserRepository.InitiativeByUser = jest
        .fn()
        .mockRejectedValue(error);
      handlersError.returnErrorRes = jest
        .fn()
        .mockReturnValue(mockErrorResponse);

      const result = await service.findInitiativeByUserId(userId);

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });

  describe('lastPopUpViewed', () => {
    it('should update the last pop-up viewed timestamp', async () => {
      const userId = 1;
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      userRepository.save = jest.fn().mockResolvedValue({
        ...mockUser,
        last_updated_by: userId,
      });

      const result = await service.lastPopUpViewed(userId);

      expect(result).toEqual({
        response: { ...mockUser, last_updated_by: userId },
        message: 'Successful response',
        status: HttpStatus.OK,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        last_updated_by: userId,
      });
    });

    it('should throw an error if user not found', async () => {
      const userId = 99;
      userRepository.findOne = jest.fn().mockResolvedValue(null);
      handlersError.returnErrorRes = jest
        .fn()
        .mockReturnValue(mockErrorResponse);

      const result = await service.lastPopUpViewed(userId);

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: {
          response: {},
          message: 'User Not found',
          status: HttpStatus.NOT_FOUND,
        },
      });
    });
  });

  describe('createOrUpdateUserFromAuthProvider', () => {
    it('should return an existing user', async () => {
      const userInfo = {
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      userRepository.update = jest.fn().mockResolvedValue({ affected: 1 });

      const result = await service.createOrUpdateUserFromAuthProvider(userInfo);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: userInfo.email.toLowerCase(), active: true },
        relations: ['obj_role_by_user'],
      });
      expect(userRepository.update).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          email: mockUser.email,
        },
        {
          last_login: expect.any(Date),
        },
      );
    });

    it('should create a new user and assign GUEST role', async () => {
      const userInfo = {
        email: 'new@example.com',
        given_name: 'New',
        family_name: 'User',
      };

      const newUser = {
        id: 3,
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        is_cgiar: false,
        active: true,
      } as User;

      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newUser);

      userRepository.save = jest.fn().mockResolvedValue(newUser);
      roleByUserRepository.createGuestRoleForUser = jest
        .fn()
        .mockResolvedValue({
          id: 3,
          role: 3,
          user: 3,
        });

      const result = await service.createOrUpdateUserFromAuthProvider(userInfo);

      expect(result).toEqual(newUser);
      expect(userRepository.findOne).toHaveBeenCalledTimes(2);
      expect(userRepository.save).toHaveBeenCalledWith({
        email: userInfo.email.toLowerCase(),
        first_name: userInfo.given_name,
        last_name: userInfo.family_name,
        is_cgiar: false,
        active: true,
      });
      expect(roleByUserRepository.createGuestRoleForUser).toHaveBeenCalledWith(
        newUser.id,
      );
    });

    it('should throw an error for invalid user info', async () => {
      const invalidUserInfo = {};

      await expect(
        service.createOrUpdateUserFromAuthProvider(invalidUserInfo),
      ).rejects.toThrow(
        'Failed to create or update user: Invalid user information in auth response',
      );
    });
  });

  describe('getAllUsers', () => {
    it('should return formatted users from raw SQL query', async () => {
      const mockQueryResult = [
        {
          firstName: 'Test',
          lastName: 'User',
          emailAddress: 'test@example.com',
          cgIAR: 'Yes',
          userStatus: 'Active',
          userCreationDate: new Date(),
        },
      ];
      userRepository.query = jest.fn().mockResolvedValue(mockQueryResult);

      const result = await service.getAllUsers();

      expect(result).toEqual({
        response: mockQueryResult,
        message: 'Successful response',
        status: HttpStatus.OK,
      });
      expect(userRepository.query).toHaveBeenCalled();
    });

    it('should handle errors in getAllUsers', async () => {
      const error = new Error('Query failed');
      userRepository.query = jest.fn().mockRejectedValue(error);
      handlersError.returnErrorRes = jest
        .fn()
        .mockReturnValue(mockErrorResponse);

      const result = await service.getAllUsers();

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });

  const createQueryBuilderMock = () => {
    const mock = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
    return mock;
  };

  describe('searchUsers', () => {
    it('should return users based on filters', async () => {
      const filters: {
        user?: string;
        cgIAR?: 'Yes' | 'No';
        status?: 'Active' | 'Inactive';
      } = {
        user: 'Test',
        cgIAR: 'Yes',
        status: 'Active',
      };

      const mockQueryResult = [
        {
          firstName: 'Test',
          lastName: 'User',
          emailAddress: 'test@example.com',
          cgIAR: 'Yes',
          userStatus: 'Active',
          userCreationDate: new Date(),
        },
      ];

    const queryBuilderMock = createQueryBuilderMock();
    queryBuilderMock.getRawMany.mockResolvedValue(mockQueryResult);
    (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilderMock);

    const result = await service.searchUsers(filters);

      expect(result).toEqual({
        response: mockQueryResult,
        message: 'Successful response',
        status: HttpStatus.OK,
      });
      expect(queryBuilderMock.getRawMany).toHaveBeenCalled();
    });

    it('should handle errors in searchUsers', async () => {
      const filters = { user: 'Fail' };
      const error = new Error('Error message');
      const queryBuilderMock = createQueryBuilderMock();
      queryBuilderMock.getRawMany.mockRejectedValue(error);
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilderMock);

      const result = await service.searchUsers(filters);

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });
});
