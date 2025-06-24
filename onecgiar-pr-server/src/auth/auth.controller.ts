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
    description: 'Search for users by name or email',
  })
  @ApiResponse({
    status: 200,
    description: 'Users found successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Users found successfully' },
        response: {
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
            },
          },
        },
        status: { type: 'number', example: 200 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async searchUsers(@Query('query') query: string) {
    if (!query) {
      return {
        message: 'Query parameter is required',
        response: [],
        status: 400,
      };
    }

    const users = await this.activeDirectoryService.searchUsers(query);

    return {
      message: 'Users found successfully',
      response: users,
      status: 200,
    };
  }
}
