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
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
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
    description: 'Search for users by name or email with real-time suggestions',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query (minimum 2 characters)',
    example: 'john.doe',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Users found successfully',
  })
  @ApiResponse({ status: 400, description: 'Query too short' })
  async searchUsers(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters',
        response: [],
        status: 400,
      };
    }

    try {
      const users = await this.activeDirectoryService.searchUsers(query.trim());

      return {
        message:
          users.length > 0 ? 'Users found successfully' : 'No users found',
        response: users,
        status: 200,
      };
    } catch (error) {
      return {
        message: `Error searching users: ${error}`,
        response: [],
        status: 500,
      };
    }
  }
}
