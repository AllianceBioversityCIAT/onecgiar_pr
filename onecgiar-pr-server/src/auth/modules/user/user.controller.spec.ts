import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateFullUserDto } from './dto/create-full-user.dto';
import { HttpStatus } from '@nestjs/common';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUser = {
    id: 1,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    is_cgiar: true,
    active: true,
  };

  const mockUsers = [
    mockUser,
    {
      id: 2,
      first_name: 'Another',
      last_name: 'User',
      email: 'another@example.com',
      is_cgiar: false,
      active: true,
    },
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
    is_cgiar: true,
    created_by: 1,
    last_updated_by: 1,
  };

  const mockCreateFullUserDto: CreateFullUserDto = {
    userData: mockCreateUserDto,
    role: 3,
  };

  const mockTokenDto: TokenDto = {
    id: 1,
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
  };

  const mockUserResponse = {
    response: mockUser,
    message: 'Successful response',
    status: HttpStatus.OK,
  };

  const mockUsersResponse = {
    response: mockUsers,
    message: 'Successful response',
    status: HttpStatus.OK,
  };

  const mockInitiativesResponse = {
    response: mockInitiatives,
    message: 'Successful response',
    status: HttpStatus.OK,
  };

  const mockCreateUserResponse = {
    response: {
      id: 1,
      first_name: 'Test',
      last_name: 'User',
    },
    message: 'User successfully created',
    status: HttpStatus.CREATED,
  };

  const mockUserService = {
    create: jest.fn((dto) => dto),
    createFull: jest.fn(() => mockCreateUserResponse),
    findAll: jest.fn(() => mockUsersResponse),
    findOne: jest.fn(() => mockUserResponse),
    findOneByEmail: jest.fn(() => mockUserResponse),
    findInitiativeByUserId: jest.fn(() => mockInitiativesResponse),
    lastPopUpViewed: jest.fn(() => mockUserResponse),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a basic user', () => {
      const result = controller.create(mockCreateUserDto);

      expect(result).toEqual(mockCreateUserDto);
      expect(userService.create).toHaveBeenCalledWith(mockCreateUserDto);
    });
  });

  describe('creteFull', () => {
    it('should create a user with role', async () => {
      const result = await controller.createFull(
        mockCreateUserDto,
        mockTokenDto,
      );

      expect(result).toEqual(mockCreateUserResponse);
      expect(userService.createFull).toHaveBeenCalledWith(
        mockCreateUserDto,
        mockTokenDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = await controller.findAll();

      expect(result).toEqual(mockUsersResponse);
      expect(userService.findAll).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const email = 'test@example.com';

      const result = await controller.findByEmail(email);

      expect(result).toEqual(mockUserResponse);
      expect(userService.findOneByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('findInitiativeByUserId', () => {
    it('should find initiatives by user ID', () => {
      const userId = 1;

      const result = controller.findInitiativeByUserId(userId);

      expect(result).toEqual(mockInitiativesResponse);
      expect(userService.findInitiativeByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('findOne', () => {
    it('should find a user by ID', async () => {
      const id = '1';

      const result = await controller.findOne(id);

      expect(result).toEqual(mockUserResponse);
      expect(userService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('lastPopUpViewed', () => {
    it('should update the last pop-up viewed timestamp', async () => {
      const userId = 1;

      const result = await controller.lastPopUpViewed(userId);

      expect(result).toEqual(mockUserResponse);
      expect(userService.lastPopUpViewed).toHaveBeenCalledWith(userId);
    });
  });
});
