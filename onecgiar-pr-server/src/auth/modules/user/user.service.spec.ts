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
import { TemplateRepository } from '../../../api/platform-report/repositories/template.repository';
import { AuthMicroserviceService } from '../../../shared/microservices/auth-microservice/auth-microservice.service';
import * as Handlebars from 'handlebars';
import { ActiveDirectoryService } from '../../services/active-directory.service';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';

describe('UserService', () => {
  let service: UserService;
  let userRepository: UserRepository;
  let customUserRepository: UserRepository;
  let roleByUserRepository: RoleByUserRepository;
  let templateRepository: TemplateRepository;
  let handlersError: HandlersError;
  let awsCognitoService: AuthMicroserviceService;

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
    is_cgiar: false,
    created_by: 1,
    last_updated_by: 1,
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

  const mockTemplateRepository = {
    findOne: jest.fn(), // no hace falta poner el mockResolvedValue aquí aún
  };
  const mockTemplateRepositoryFactory = () => mockTemplateRepository;

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

  const mockActiveDirectoryService = {
    searchUsers: jest.fn(),
  };

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
        {
          provide: TemplateRepository,
          useFactory: mockTemplateRepositoryFactory,
        },
        {
          provide: AuthMicroserviceService,
          useValue: {
            createUser: jest.fn(),
          },
        },
        {
          provide: ActiveDirectoryService,
          useValue: mockActiveDirectoryService,
        },
        {
          provide: EmailNotificationManagementService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<UserRepository>(getRepositoryToken(User));
    customUserRepository = module.get<UserRepository>(UserRepository);
    roleByUserRepository =
      module.get<RoleByUserRepository>(RoleByUserRepository);
    handlersError = module.get<HandlersError>(HandlersError);
    templateRepository = module.get<TemplateRepository>(TemplateRepository);
    awsCognitoService = module.get<AuthMicroserviceService>(
      AuthMicroserviceService,
    );
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
    it('should create the user correctly if it does not exist and is not CGIAR', async () => {
      const createUserDto = {
        email: 'user@example.com',
        is_cgiar: false,
        first_name: 'John',
        last_name: 'Doe',
        entity: 'Entity A',
        role_entity: 3,
      };

      jest.spyOn(service, 'findOneByEmail').mockResolvedValue({
        response: null,
        message: null,
        status: HttpStatus.OK,
      });

      mockTemplateRepository.findOne.mockResolvedValue({
        name: 'EXTERNAL_USER',
        html: '<p>{{assignedEntity}} - {{assignedRole}}</p>',
      });
      jest
        .spyOn(Handlebars, 'compile')
        .mockReturnValue(
          (data: { assignedEntity: string; assignedRole: string }) => {
            return `<p>${data.assignedEntity} - ${data.assignedRole}</p>`;
          },
        );

      awsCognitoService.createUser = jest.fn().mockResolvedValue({});
      userRepository.findOne = jest.fn().mockResolvedValue(null);
      userRepository.save = jest
        .fn()
        .mockResolvedValue({ id: 10, first_name: 'John', last_name: 'Doe' });
      roleByUserRepository.save = jest.fn().mockResolvedValue({});

      const result = await service.createFull(createUserDto, mockTokenDto);

      const user = result.response as User;

      console.log('RESULT:', result);
      expect(result.status).toBe(201);
      expect(user.id).toBe(10);
      expect(awsCognitoService.createUser).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(roleByUserRepository.save).toHaveBeenCalledTimes(2); // platform + entity
    });

    it('❌ debe lanzar error si el usuario ya existe', async () => {
      const dto = { email: 'exists@example.com', is_cgiar: false };
      jest.spyOn(service, 'findOneByEmail').mockResolvedValue({
        response: mockUser,
        message: null,
        status: HttpStatus.OK,
      });

      const result = await service.createFull(dto as any, {} as any);
      expect(result).toEqual(
        expect.objectContaining({
          message: 'The user already exists in the system',
          status: 400,
        }),
      );
    });

    it('❌ debe lanzar error si el correo es @cgiar.org y no es CGIAR', async () => {
      const dto = {
        email: 'someone@cgiar.org',
        is_cgiar: false,
      };

      jest.spyOn(service, 'findOneByEmail').mockResolvedValue({
        response: mockUser,
        message: null,
        status: HttpStatus.OK,
      });

      const result = await service.createFull(dto as any, {} as any);
      expect(result).toEqual(
        expect.objectContaining({
          message: 'Non-CGIAR user cannot have a CGIAR email address',
          status: 400,
        }),
      );
    });

    it('❌ debe lanzar error si falla Cognito', async () => {
      const dto = {
        email: 'external@example.com',
        is_cgiar: false,
        first_name: 'Test',
        last_name: 'User',
      };

      jest.spyOn(service, 'findOneByEmail').mockResolvedValue({
        response: null,
        message: null,
        status: HttpStatus.OK,
      });

      templateRepository.findOne = jest
        .fn()
        .mockResolvedValue('<p>Welcome</p>');
      jest
        .spyOn(Handlebars, 'compile')
        .mockReturnValue(() => '<p>template</p>');

      awsCognitoService.createUser = jest
        .fn()
        .mockRejectedValue(new Error('Cognito error'));

      const result = await service.createFull(dto as any, mockTokenDto);

      expect(result).toEqual(
        expect.objectContaining({
          message: 'Error while creating user',
          status: 500,
        }),
      );
    });

    it('❌ debe manejar error general con _handlersError', async () => {
      jest.spyOn(service, 'findOneByEmail').mockImplementation(() => {
        throw new Error('Unexpected failure');
      });

      handlersError.returnErrorRes = jest.fn().mockReturnValue({
        message: 'Handled error',
        status: 500,
      });

      const result = await service.createFull({ email: 'a' } as any, {} as any);

      expect(handlersError.returnErrorRes).toHaveBeenCalled();
      expect(result.message).toBe('Handled error');
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
      orderBy: jest.fn().mockReturnThis(),
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
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        queryBuilderMock,
      );

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
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.searchUsers(filters);

      expect(result).toEqual(mockErrorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });
});
