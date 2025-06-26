import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  Patch,
  Query,
  ValidationPipe,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { DecodedUser } from '../../../shared/decorators/user-token.decorator';
import {
  ApiTags,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@ApiHeader({
  name: 'auth',
  description: 'JWT token required for authentication',
  required: true,
})
@Controller()
@UseInterceptors(ResponseInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({
    summary: 'Create basic user',
    description: 'Creates a new user with basic information',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User information to create',
    examples: {
      example1: {
        summary: 'Basic user example',
        value: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          is_cgiar: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or missing fields',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user with this email already exists',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('create')
  @ApiOperation({
    summary: 'Create complete user with role',
    description:
      'Creates a new user with complete information including role assignment',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User information to create',
    examples: {
      example1: {
        summary: 'Basic user example',
        value: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          is_cgiar: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created with assigned role',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or missing fields',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user with this email already exists',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - role does not exist',
  })
  async creteFull(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: () => {
          const response = {};
          return new BadRequestException({
            response,
            message:
              'Some fields contain errors or are incomplete. Please review your input.',
            status: HttpStatus.BAD_REQUEST,
          });
        },
      }),
    )
    createFullUserDto: CreateUserDto,
    @DecodedUser() user: TokenDto,
  ) {
    return this.userService.createFull(createFullUserDto, user);
  }

  @Get('get/all')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieves all active users in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all users retrieved successfully',
  })
  async findAll() {
    return this.userService.findAll();
  }

  @Get('get/users_list')
  @ApiOperation({
    summary: 'Get list users',
    description: 'Get list of all users with their details',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    schema: {
      example: {
        data: [
          {
            firstName: 'John',
            lastName: 'Doe',
            emailAddress: 'john.doe@example.com',
            cgIAR: 'Yes',
            userStatus: 'Active',
            userCreationDate: '2024-03-10T12:00:00.000Z',
          },
        ],
      },
    },
  })
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search users by name, email, CGIAR, or status (partial match)',
  })
  @ApiQuery({ name: 'user', required: false, type: String })
  @ApiQuery({ name: 'cgIAR', required: false, enum: ['Yes', 'No'] })
  @ApiQuery({ name: 'status', required: false, enum: ['Active', 'Inactive'] })
  @ApiResponse({
    status: 200,
    description:
      'Returns list of users matching the search criteria or a message if none match',
    schema: {
      example: {
        data: [
          {
            firstName: 'Jane',
            lastName: 'Doe',
            emailAddress: 'jane.doe@cgiar.org',
            cgIAR: 'Yes',
            userStatus: 'Active',
            userCreationDate: '2024-05-10T14:33:00.000Z',
          },
        ],
      },
    },
  })
  async searchUsers(
    @Query('user') user?: string,
    @Query('cgIAR') cgIAR?: 'Yes' | 'No',
    @Query('status') status?: 'Active' | 'Inactive',
  ) {
    const result = await this.userService.searchUsers({ user, cgIAR, status });

    if (result.response.length === 0) {
      return {
        status: result.status,
        message: 'No users match the entered criteria',
        response: [],
      };
    }

    return result;
  }

  @Get('get/all/:email')
  @ApiOperation({
    summary: 'Find user by email',
    description: 'Search for a user using their email address',
  })
  @ApiParam({
    name: 'email',
    type: 'string',
    description: 'User email address',
    example: 'user@example.com',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'User found by email',
  })
  @ApiResponse({
    status: 404,
    description: 'User with provided email not found',
  })
  async findByEmail(@Param('email') email: string) {
    return this.userService.findOneByEmail(email);
  }

  @Get('get/initiative/:userId')
  @ApiOperation({
    summary: 'Find user initiatives',
    description: 'Retrieves all initiatives associated with a specific user ID',
  })
  @ApiParam({
    name: 'userId',
    type: 'number',
    description: 'User ID',
    example: 1,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Initiatives found',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          initiative_id: { type: 'number', example: 1 },
          official_code: { type: 'string', example: 'INIT-001' },
          initiative_name: { type: 'string', example: 'Climate Initiative' },
          short_name: { type: 'string', example: 'CI' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or has no associated initiatives',
  })
  findInitiativeByUserId(@Param('userId') userId: number) {
    return this.userService.findInitiativeByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Find user by ID',
    description: 'Retrieves a specific user by their ID',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch('last-pop-up-viewed/:userId')
  @ApiOperation({
    summary: 'Update last pop-up viewed',
    description:
      'Updates the timestamp of when a user last viewed a pop-up notification',
  })
  @ApiParam({
    name: 'userId',
    type: 'number',
    description: 'User ID',
    example: 1,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Last pop-up viewed timestamp updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async lastPopUpViewed(@Param('userId') userId: number) {
    return this.userService.lastPopUpViewed(userId);
  }
}
