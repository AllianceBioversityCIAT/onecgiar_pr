import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
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
import { RoleRepository } from '../role/Role.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { DataSource } from 'typeorm';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { VersionRepository } from '../../../api/versioning/versioning.repository';
import { GlobalParameterRepository } from '../../../api/global-parameter/repositories/global-parameter.repository';

describe('UserService', () => {
  let service: UserService;
  let userRepository: UserRepository;
  let customUserRepository: UserRepository;
  let roleByUserRepository: RoleByUserRepository;
  let templateRepository: TemplateRepository;
  let handlersError: HandlersError;
  let awsCognitoService: AuthMicroserviceService;
  let clarisaInitiativesRepository: ClarisaInitiativesRepository;
  let roleRepository: RoleRepository;
  let versionRepository: VersionRepository;

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
    findOne: jest.fn(),
  };
  const mockTemplateRepositoryFactory = () => mockTemplateRepository;

  const mockRoleByUserRepositoryFactory = jest.fn(() => ({
    save: jest.fn(),
    createGuestRoleForUser: jest.fn(),
    find: jest.fn(),
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

  const mockRoleRepositoryFactory = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    getAllRoles: jest.fn(),
  });

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
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
          provide: DataSource,
          useValue: mockDataSource,
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
        {
          provide: ClarisaInitiativesRepository,
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: RoleRepository,
          useFactory: mockRoleRepositoryFactory,
        },
        {
          provide: VersionRepository,
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: GlobalParameterRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ value: '' }),
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
    clarisaInitiativesRepository = module.get<ClarisaInitiativesRepository>(
      ClarisaInitiativesRepository,
    );
    roleRepository = module.get<RoleRepository>(RoleRepository);
    versionRepository = module.get<VersionRepository>(VersionRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAndAssignRoles (versions/portfolio rules)', () => {
    const baseUser: User = {
      id: 55,
      email: 'u@cgiar.org',
      first_name: 'U',
      last_name: 'S',
      is_cgiar: true,
      active: true,
    } as any;
    const currentUser: User = { id: 99 } as any;

    beforeEach(() => {
      // Reset manager mock per test
      (mockQueryRunner.manager.findOne as jest.Mock).mockReset();
      (mockQueryRunner.manager.save as jest.Mock).mockReset();
      (versionRepository.find as jest.Mock).mockReset();
    });

    it('allows non-member role when entity portfolio has an open phase', async () => {
      // Active versions contain portfolio_id 5
      (versionRepository.find as jest.Mock).mockResolvedValue([
        {
          id: 1,
          is_active: true,
          status: true,
          portfolio_id: 5,
          app_module_id: 1,
        },
      ]);

      // No previous assignment in that entity
      (mockQueryRunner.manager.findOne as jest.Mock).mockImplementation(
        (_entity: any, opts: any) => {
          // Existing assignment (RoleByUser without relations)
          if (!opts?.relations) return null;
          // Entity fetch (ClarisaInitiative with obj_portfolio relation)
          if (opts?.relations?.includes('obj_portfolio')) {
            return {
              id: opts.where.id,
              active: true,
              portfolio_id: 5,
              obj_portfolio: { id: 5 },
            } as any as ClarisaInitiative;
          }
          // Existing lead (RoleByUser with obj_user,obj_initiative relations) -> none
          if (opts?.relations?.includes('obj_user')) return null;
          return null;
        },
      );

      await expect(
        (service as any).validateAndAssignRoles(
          mockQueryRunner as any,
          [{ role_id: 3, entity_id: 777 }],
          baseUser,
          currentUser,
        ),
      ).resolves.not.toThrow();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });

    it('blocks non-member role when entity portfolio has no open phase', async () => {
      // Active versions contain portfolio_id 7 (not 5)
      (versionRepository.find as jest.Mock).mockResolvedValue([
        {
          id: 1,
          is_active: true,
          status: true,
          portfolio_id: 7,
          app_module_id: 2,
        },
      ]);

      // No previous assignment; entity portfolio_id = 5
      (mockQueryRunner.manager.findOne as jest.Mock).mockImplementation(
        (_entity: any, opts: any) => {
          if (!opts?.relations) return null;
          if (opts?.relations?.includes('obj_portfolio')) {
            return {
              id: opts.where.id,
              active: true,
              portfolio_id: 5,
              obj_portfolio: { id: 5 },
            } as any as ClarisaInitiative;
          }
          if (opts?.relations?.includes('obj_user')) return null;
          return null;
        },
      );

      await expect(
        (service as any).validateAndAssignRoles(
          mockQueryRunner as any,
          [{ role_id: 3, entity_id: 888 }],
          baseUser,
          currentUser,
        ),
      ).rejects.toThrow(
        'Only "Member" role is allowed in portfolios without an open phase.',
      );
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('skips versions validation if user previously had non-member role in entity', async () => {
      (versionRepository.find as jest.Mock).mockResolvedValue([]); // would block if not skipped

      // Existing non-member role assignment in same entity
      (mockQueryRunner.manager.findOne as jest.Mock).mockImplementation(
        (_entity: any, opts: any) => {
          if (!opts?.relations)
            return {
              id: 1234,
              role: 3, // non-member
              user: baseUser.id,
              initiative_id: 999,
              active: true,
            };
          if (opts?.relations?.includes('obj_portfolio')) {
            return {
              id: opts.where.id,
              active: true,
              portfolio_id: 42,
              obj_portfolio: { id: 42 },
            } as any as ClarisaInitiative;
          }
          if (opts?.relations?.includes('obj_user')) return null;
          return null;
        },
      );

      await expect(
        (service as any).validateAndAssignRoles(
          mockQueryRunner as any,
          [{ role_id: 4, entity_id: 999 }],
          baseUser,
          currentUser,
        ),
      ).resolves.not.toThrow();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });
  });

  describe('createFull', () => {
    it('should create the user correctly if it does not exist and is not CGIAR', async () => {
      const createUserDto = {
        email: 'user@example.com',
        is_cgiar: false,
        first_name: 'John',
        last_name: 'Doe',
        role_assignments: [{ role_id: 1, entity_id: 5 }],
      };

      jest.spyOn(service, 'findOneByEmail').mockResolvedValue({
        response: null,
        message: null,
        status: HttpStatus.OK,
      });

      mockTemplateRepository.findOne.mockResolvedValue({
        name: 'email_template_new_external_user',
        template: '<p>{{assignedEntity}} - {{assignedRole}}</p>',
      });
      jest
        .spyOn(Handlebars, 'compile')
        .mockReturnValue(
          (data: { assignedEntity: string; assignedRole: string }) => {
            return `<p>${data.assignedEntity} - ${data.assignedRole}</p>`;
          },
        );

      jest.spyOn(clarisaInitiativesRepository, 'find').mockResolvedValue([
        {
          id: 5,
          official_code: 'ENTITi-05',
        } as ClarisaInitiative,
      ]);

      jest.spyOn(roleRepository, 'find').mockResolvedValue([
        {
          id: 1,
          description: 'PLATFORM_USER',
          active: true,
          role_level_id: 1,
          created_at: new Date(),
          updated_at: new Date(),
          updated_by: null,
        },
      ]);
      (awsCognitoService.createUser as jest.Mock).mockResolvedValue({});
      userRepository.findOne = jest.fn().mockResolvedValue(null);
      userRepository.save = jest
        .fn()
        .mockResolvedValue({ id: 10, first_name: 'John', last_name: 'Doe' });
      roleByUserRepository.save = jest.fn().mockResolvedValue({});

      jest.spyOn(service as any, 'saveUserToDB').mockResolvedValue({
        response: {
          id: 10,
          first_name: 'John',
          last_name: 'Doe',
        },
        message: 'User created successfully',
        status: 201,
      });

      const result = await service.createFull(createUserDto, mockTokenDto.id);

      const user = result.response as User;

      expect(result.status).toBe(201);
      expect(user.id).toBe(10);
      expect(awsCognitoService.createUser).toHaveBeenCalled();
    });

    it('throws error if the user already exists', async () => {
      const dto = { email: 'exists@example.com', is_cgiar: false };
      jest.spyOn(service, 'findOneByEmail').mockResolvedValue({
        response: mockUser,
        message: null,
        status: HttpStatus.OK,
      });

      const result = await service.createFull(dto as any, mockTokenDto.id);
      expect(result).toEqual(
        expect.objectContaining({
          message: 'The user already exists in the system',
          status: 400,
        }),
      );

      expect(awsCognitoService.createUser).not.toHaveBeenCalled();
    });

    it('throws error if email is @cgiar.org and user is not CGIAR', async () => {
      const dto = {
        email: 'someone@cgiar.org',
        is_cgiar: false,
      };

      jest.spyOn(service, 'findOneByEmail').mockResolvedValue({
        response: mockUser,
        message: null,
        status: HttpStatus.OK,
      });

      const result = await service.createFull(dto as any, mockTokenDto.id);
      expect(result).toEqual(
        expect.objectContaining({
          message: 'Non-CGIAR user cannot have a CGIAR email address',
          status: 400,
        }),
      );
    });

    it('throws error if Cognito fails', async () => {
      const dto = {
        email: 'external@example.com',
        is_cgiar: false,
        first_name: 'Test',
        last_name: 'User',
        role_assignments: [],
      };

      jest.spyOn(service, 'findOneByEmail').mockResolvedValue({
        response: null,
        message: null,
        status: HttpStatus.OK,
      });

      templateRepository.findOne = jest.fn().mockResolvedValue({
        name: 'email_template_new_external_user',
        template: '<p>Welcome</p>',
      });
      jest
        .spyOn(Handlebars, 'compile')
        .mockReturnValue(() => '<p>template</p>');

      (awsCognitoService.createUser as jest.Mock).mockRejectedValue(
        new Error('Cognito error'),
      );

      jest.spyOn(handlersError, 'returnErrorRes').mockReturnValue({
        message: 'Error while creating user',
        status: 500,
        response: null,
      });

      const result = await service.createFull(dto as any, mockTokenDto.id);

      expect(result).toEqual(
        expect.objectContaining({
          message: 'Error while creating user',
          status: 500,
        }),
      );
    });

    it('handles general error with _handlersError', async () => {
      jest.spyOn(service, 'findOneByEmail').mockImplementation(() => {
        throw new Error('Unexpected failure');
      });

      handlersError.returnErrorRes = jest.fn().mockReturnValue({
        message: 'Handled error',
        status: 500,
      });

      const result = await service.createFull(
        { email: 'a' } as any,
        mockTokenDto.id,
      );

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

  describe('updateUserRoles', () => {
    it('sends roles-updated email when roles change (same initiative, different role)', async () => {
      // Arrange
      const dto: any = {
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role_assignments: [
          { entity_id: 1, role_id: 4 }, // new role in same entity
        ],
      };

      // user exists
      userRepository.findOneByOrFail = jest.fn().mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_cgiar: true,
      } as User);

      // existing active role for same initiative but different role
      roleByUserRepository.find = jest
        .fn()
        .mockResolvedValue([
          { id: 101, user: 1, initiative_id: 1, role: 3, active: true },
        ]);

      // deactivate old role
      roleByUserRepository.save = jest.fn().mockResolvedValue({});

      // compile template for roles update
      mockTemplateRepository.findOne.mockResolvedValue({
        name: 'email_template_roles_update',
        template: '<p>{{userName}}</p>',
      });

      jest.spyOn(Handlebars, 'compile').mockReturnValue((data: any) => {
        return `<p>${data.userName}</p>`;
      });

      // initiatives and roles for mapping
      (clarisaInitiativesRepository.find as jest.Mock).mockResolvedValue([
        {
          id: 1,
          official_code: 'INIT-001',
          short_name: 'CI',
          name: 'Climate Initiative',
        } as any,
      ]);
      roleRepository.find = jest.fn().mockResolvedValue([
        { id: 3, description: 'Coordinator' },
        { id: 4, description: 'Member' },
      ]);

      // update name
      userRepository.update = jest.fn().mockResolvedValue({});

      // persist new assignment through main flow (avoid deep behavior)
      jest.spyOn(service as any, 'saveUserToDB').mockResolvedValue({
        response: { id: 1, email: 'test@example.com' },
        message: 'Roles updated successfully',
        status: 200,
      });

      const emailService = (service as any)
        ._emailNotificationManagementService as EmailNotificationManagementService;
      const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');

      // Act
      const result = await service.updateUserRoles(dto, mockTokenDto);

      // Assert
      expect(result.status).toBe(200);
      expect(sendEmailSpy).toHaveBeenCalled();
      const payload = (sendEmailSpy.mock.calls[0] || [])[0];
      expect(payload?.emailBody?.subject).toBe(
        'PRMS - Your Account Details Have Been Updated',
      );
    });
  });

  describe('updateUserStatus (simplified)', () => {
    const mockUser = {
      id: 1,
      email: 'user@example.com',
      active: false,
      is_cgiar: true,
    } as User;

    const mockToken = { id: 99 } as TokenDto;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should activate an inactive user and send notification email', async () => {
      const dto = { activate: true } as any;

      jest
        .spyOn(service as any, 'findUserWithRelations')
        .mockResolvedValue({ ...mockUser });
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: mockToken.id } as User);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...mockUser, active: true });
      jest
        .spyOn(service as any, 'sendUserStatusChangedEmail')
        .mockResolvedValue(undefined);

      const result = await service.updateUserStatus(
        mockUser.email,
        dto,
        mockToken,
      );

      expect(result).toEqual({
        response: { id: mockUser.id, email: mockUser.email },
        message: 'User activated successfully',
        status: HttpStatus.OK,
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: true }),
      );
      expect(service['sendUserStatusChangedEmail']).toHaveBeenCalled();
    });

    it('should deactivate a user and send notification email', async () => {
      const dto = { activate: false } as any;
      const activeUser = { ...mockUser, active: true };

      jest
        .spyOn(service as any, 'findUserWithRelations')
        .mockResolvedValue(activeUser);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: mockToken.id } as User);
      jest.spyOn(service as any, 'deactivateUserCompletely').mockResolvedValue({
        response: { id: activeUser.id, email: activeUser.email },
        message: 'User deactivated successfully',
        status: HttpStatus.OK,
      });
      jest
        .spyOn(service as any, 'sendUserStatusChangedEmail')
        .mockResolvedValue(undefined);

      const result = await service.updateUserStatus(
        activeUser.email,
        dto,
        mockToken,
      );

      expect(result).toEqual({
        response: { id: activeUser.id, email: activeUser.email },
        message: 'User deactivated successfully',
        status: HttpStatus.OK,
      });

      expect(service['deactivateUserCompletely']).toHaveBeenCalledWith(
        activeUser,
        { id: mockToken.id },
      );
      expect(service['sendUserStatusChangedEmail']).toHaveBeenCalled();
    });

    it('should throw error if email is empty', async () => {
      await expect(
        service.updateUserStatus('', { activate: true } as any, mockToken),
      ).rejects.toThrow(new BadRequestException('Invalid or missing email'));
    });
  });

  const createQueryBuilderMock = () => {
    return {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
  };

  describe('searchUsers', () => {
    it('should return users based on filters', async () => {
      const filters: {
        user?: string;
        cgIAR?: 'Yes' | 'No';
        status?: 'Active' | 'Inactive' | 'Read Only';
        entityIds?: number[];
      } = {
        user: 'Test',
        cgIAR: 'Yes',
        status: 'Active',
        entityIds: [1, 2, 3],
      };

      const mockQueryResult = [
        {
          firstName: 'Test',
          lastName: 'User',
          emailAddress: 'test@example.com',
          cgIAR: 'Yes',
          userStatus: 'Active',
          userCreationDate: new Date(),
          entities: 'ENT-001, ENT-002',
          createdByFirstName: 'Creator',
          createdByLastName: 'Owner',
          createdByEmail: 'creator@example.com',
        },
      ];

      const queryBuilderMock = createQueryBuilderMock();
      queryBuilderMock.getRawMany.mockResolvedValue(mockQueryResult);
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.searchUsers(filters);

      expect(result).toEqual({
        response: [
          {
            ...mockQueryResult[0],
            entities: ['ENT-001', 'ENT-002'],
          },
        ],
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

  describe('findCurrentPortfolioByUserId', () => {
    it('should group initiatives by active module portfolios (IPSR/Reporting)', async () => {
      (versionRepository.find as jest.Mock).mockResolvedValue([
        {
          id: 100,
          is_active: true,
          status: true,
          portfolio_id: 3,
          app_module_id: 1,
          obj_app_module: { name: 'IPSR' },
        },
        {
          id: 101,
          is_active: true,
          status: true,
          portfolio_id: 2,
          app_module_id: 2,
          obj_app_module: { name: 'Reporting' },
        },
      ]);

      (roleByUserRepository.find as jest.Mock)
        .mockResolvedValueOnce([
          {
            obj_initiative: {
              id: 52,
              official_code: 'SP03',
              name: 'Sustainable Animal and Aquatic Foods ',
              short_name: 'Sustainable Animal and Aquatic Foods ',
              cgiar_entity_type_id: 22,
              portfolio_id: 3,
              obj_cgiar_entity_type: { code: 22, name: 'Science programs' },
              active: true,
            } as any,
          },
        ])
        .mockResolvedValueOnce([
          {
            obj_initiative: {
              id: 3,
              official_code: 'INIT-03',
              name: 'Genebanks',
              short_name: 'Genebanks',
              cgiar_entity_type_id: 6,
              portfolio_id: 2,
              obj_cgiar_entity_type: { code: 6, name: 'Initiative' },
              active: true,
            } as any,
          },
        ]);

      const result = await service.findCurrentPortfolioByUserId(326);

      expect(versionRepository.find).toHaveBeenCalledWith({
        where: { is_active: true, status: true },
        relations: { obj_app_module: true },
        order: { id: 'DESC' },
      });
      expect(roleByUserRepository.find).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(HttpStatus.OK);
      const resp: any = result.response as any;
      expect(resp.ipsr).toBeDefined();
      expect(resp.reporting).toBeDefined();
      expect(resp.ipsr[0]).toEqual(
        expect.objectContaining({ portfolio_id: 3, initiative_id: 52 }),
      );
      expect(resp.reporting[0]).toEqual(
        expect.objectContaining({ portfolio_id: 2, initiative_id: 3 }),
      );
    });

    it('should handle errors with returnErrorRes', async () => {
      const error = new Error('DB error');
      (versionRepository.find as jest.Mock).mockRejectedValue(error);

      const result = await service.findCurrentPortfolioByUserId(1);
      expect(result).toEqual(
        expect.objectContaining({
          message: expect.any(String),
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
      );
    });
  });

  describe('validateToken', () => {
    it('should return 200 and user info if token is valid', async () => {
      const validUser: TokenDto = {
        id: 1,
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };
      const result = await service.validateToken(validUser);
      expect(result).toEqual({
        status: 200,
        message: 'Token is valid',
        response: {
          id: 1,
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_valid: true,
        },
      });
    });

    it('should return 401 if token is missing or invalid', async () => {
      const result = await service.validateToken({} as TokenDto);
      expect(result).toEqual({
        status: 401,
        message: 'Invalid or missing token',
        response: null,
      });
    });
  });
});
