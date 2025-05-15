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

@Controller()
@ApiTags('auth')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/login/provider')
  @ApiOperation({ summary: 'Get authentication URL for OAuth provider' })
  @ApiResponse({
    status: 200,
    description: 'Authentication URL generated successfully',
  })
  getAuthURL(@Query('provider') provider: string) {
    return this.authService.getAuthURL(provider);
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
}
