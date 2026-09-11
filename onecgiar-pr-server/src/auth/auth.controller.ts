import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
  Get,
  Query,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import { ResponseInterceptor } from '../shared/Interceptors/Return-data.interceptor';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { UserLoginDto } from './dto/login-user.dto';
import { CompletePasswordChallengeDto } from './dto/complete-password-challenge.dto';
import { ActiveDirectoryService } from './services/active-directory.service';
import { OtpStartDto } from './dto/otp-start.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { OtpThrottlerGuard } from './guards/otp-throttler.guard';

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
  @ApiQuery({
    name: 'redirectUri',
    required: false,
    description:
      'Redirect URI to use after OAuth authentication. Must be listed in ALLOWED_REDIRECT_URIS.',
    example: 'https://prtest.ciat.cgiar.org/auth',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication URL generated successfully',
  })
  getAuthURL(
    @Query('provider') provider: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    return this.authService.getAuthURL(provider, redirectUri);
  }

  @Get('/login/otp/config')
  @ApiOperation({
    summary: 'Get the Center-path (email one-time-code) allowed domains',
    description:
      'Public, read-only config for the Center login path. Empty domains list keeps the path hidden on the client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Allowed domains retrieved successfully',
  })
  getOtpConfig() {
    return this.authService.getOtpConfig();
  }

  @Post('/login/otp/start')
  @UseGuards(OtpThrottlerGuard)
  // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework round 2, Leader
  // correction) — plain @SkipThrottle() skips the app-global default throttler
  // (the only one `ThrottlerModule.forRoot` declares — no named `otp` entry,
  // see app.module.ts) so ThrottlerExcludeBilateralGuard contributes nothing
  // here. OtpThrottlerGuard enforces its OWN limit (5/900s) via its own
  // storage key/namespace — not `@Throttle` — so it can never leak onto any
  // other route in the app.
  @SkipThrottle()
  @ApiOperation({
    summary: 'Start the Center (email OTP) sign-in challenge',
    description:
      'Byte-identical neutral 200 for known and unknown users (OTP-R-3). 400 only for a domain outside the allow-list.',
  })
  @ApiResponse({ status: 200, description: 'Neutral response, code sent' })
  @ApiResponse({ status: 400, description: 'Domain not allowed' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 503, description: 'Sign-in service unavailable' })
  startOtp(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: OtpStartDto,
  ) {
    return this.authService.startOtp(dto);
  }

  @Post('/login/otp/verify')
  @UseGuards(OtpThrottlerGuard)
  @SkipThrottle()
  @ApiOperation({
    summary: 'Verify the Center (email OTP) sign-in challenge',
    description:
      'Same success shape as /login/custom on success (OTP-R-5, OTP-DD-4).',
  })
  @ApiResponse({ status: 200, description: 'Successful login' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (neutral or code error)',
  })
  @ApiResponse({ status: 403, description: 'User has no roles assigned' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 503, description: 'Sign-in service unavailable' })
  verifyOtp(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: OtpVerifyDto,
  ) {
    return this.authService.verifyOtp(dto);
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
