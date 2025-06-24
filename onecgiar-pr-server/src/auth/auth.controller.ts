import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  UseInterceptors,
  Get,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import { ResponseInterceptor } from '../shared/Interceptors/Return-data.interceptor';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { UserLoginDto } from './dto/login-user.dto';
import { CompletePasswordChallengeDto } from './dto/complete-password-challenge.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { ActiveDirectoryService } from './services/active-directory.service';

@Controller()
@ApiTags('Authentication')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly activeDirectoryService: ActiveDirectoryService,
  ) {}

  @Get('/login/provider')
  @ApiOperation({ summary: 'Get authentication URL for OAuth provider' })
  @ApiResponse({
    status: 200,
    description: 'Authentication URL generated successfully',
  })
  getAuthURL(@Query('provider') provider: string) {
    return this.authService.getAuthURL(provider);
  }

  @Post('/login/custom')
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, description: 'Successful login' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  login(@Body() userLogin: UserLoginDto) {
    return this.authService.singIn(userLogin);
  }

  @Post('/validate/code')
  @ApiOperation({
    summary: 'Validate OAuth authorization code and authenticate user',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  validateAuthCode(@Body() authCodeDto: AuthCodeValidationDto) {
    return this.authService.validateAuthCode(authCodeDto);
  }

  @Post('/complete-password-challenge')
  @ApiOperation({
    summary: 'Complete new password challenge for first-time login',
  })
  @ApiResponse({
    status: 200,
    description: 'Password set successfully, user authenticated',
  })
  @ApiResponse({ status: 400, description: 'Invalid challenge data' })
  async completePasswordChallenge(
    @Body() challengeDto: CompletePasswordChallengeDto,
  ) {
    return this.authService.completePasswordChallenge(challengeDto);
  }

  @Post('/signin/pusher/result/:resultId/:userId')
  @UseInterceptors()
  @HttpCode(200)
  async signInPusher(
    @Body() pusherAuthDot: PusherAuthDot,
    @Param('resultId') resultId: number,
    @Param('userId') userId: number,
  ) {
    const response = await this.authService.pusherAuth(
      pusherAuthDot,
      resultId,
      userId,
    );
    return response.auth;
  }

  @Get('/users/search')
  @ApiOperation({
    summary: 'Search users in Active Directory',
    description:
      'Search for users in Active Directory by name, email, or username. Supports real-time search with caching for better performance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users found successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Users found successfully' },
        response: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  cn: { type: 'string', example: 'John Doe' },
                  displayName: { type: 'string', example: 'John Doe' },
                  mail: { type: 'string', example: 'john.doe@cgiar.org' },
                  sAMAccountName: { type: 'string', example: 'jdoe' },
                  givenName: { type: 'string', example: 'John' },
                  sn: { type: 'string', example: 'Doe' },
                  userPrincipalName: {
                    type: 'string',
                    example: 'john.doe@cgiar.org',
                  },
                  department: { type: 'string', example: 'IT Department' },
                  title: { type: 'string', example: 'Software Developer' },
                },
              },
            },
            total: { type: 'number', example: 5 },
            hasMore: { type: 'boolean', example: false },
          },
        },
        status: { type: 'number', example: 200 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid authentication required',
  })
  @ApiResponse({
    status: 503,
    description: 'Active Directory service unavailable',
  })
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    const result = await this.activeDirectoryService.searchUsers(
      searchDto.query,
      searchDto.limit,
      searchDto.useCache,
    );

    return {
      message: 'Users found successfully',
      response: result,
      status: 200,
    };
  }

  @Get('/users/search/status')
  @ApiOperation({
    summary: 'Get Active Directory service status',
    description:
      'Returns the current status of the Active Directory service, including configuration and cache statistics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Service status retrieved successfully',
        },
        response: {
          type: 'object',
          properties: {
            initialized: { type: 'boolean', example: true },
            hasConfig: { type: 'boolean', example: true },
            configDetails: {
              type: 'object',
              properties: {
                hasUrl: { type: 'boolean', example: true },
                hasBaseDN: { type: 'boolean', example: true },
                hasDomain: { type: 'boolean', example: true },
              },
            },
            cacheStats: {
              type: 'object',
              properties: {
                size: { type: 'number', example: 5 },
                keys: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        status: { type: 'number', example: 200 },
      },
    },
  })
  async getSearchServiceStatus() {
    const status = this.activeDirectoryService.getServiceStatus();

    return {
      message: 'Service status retrieved successfully',
      response: status,
      status: 200,
    };
  }
}
