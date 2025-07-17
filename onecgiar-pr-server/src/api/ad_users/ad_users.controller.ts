import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { AdUserService } from './ad_users.service';
import {
  SearchUsersResponseDto,
  ValidateEmailResponseDto,
} from './dto/ad-user.dto';

@Controller()
@ApiTags('Active Directory Users')
@UseInterceptors(ResponseInterceptor)
export class AdUsersController {
  constructor(private readonly adUserService: AdUserService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search users for lead contact person',
    description:
      'Search users in local cache first, then Active Directory if needed. Returns cached results when available to improve performance.',
  })
  @ApiQuery({
    name: 'query',
    description:
      'Search query (minimum 2 characters). Searches across name, email, username, title, department, and company.',
    example: 'john.doe',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Users found successfully',
    type: SearchUsersResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameter (less than 2 characters)',
  })
  async searchUsers(@Query('query') query: string) {
    return await this.adUserService.searchUsers(query);
  }

  @Get('validate')
  @ApiOperation({
    summary: 'Validate lead contact person email',
    description:
      'Validate if an email exists in Active Directory and return user details if found.',
  })
  @ApiQuery({
    name: 'email',
    description: 'Email address to validate',
    example: 'john.doe@cgiar.org',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Email validation result',
    type: ValidateEmailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Missing email parameter',
  })
  async validateEmail(@Query('email') email: string) {
    return await this.adUserService.validateLeadContactPerson(email);
  }
}
