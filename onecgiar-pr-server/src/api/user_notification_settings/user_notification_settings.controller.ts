import { Controller, Body, Patch, Get, Param } from '@nestjs/common';
import { UserNotificationSettingsService } from './user_notification_settings.service';
import { UserNotificationSettingDto } from './dto/create-user-notification-setting.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeaders,
} from '@nestjs/swagger';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

@ApiTags('User Notification Settings')
@ApiHeaders([{ name: 'auth', required: true }])
@Controller()
export class UserNotificationSettingsController {
  constructor(
    private readonly userNotificationSettingsService: UserNotificationSettingsService,
  ) {}

  @Patch('update')
  @ApiOperation({ summary: 'Update user notification settings' })
  @ApiResponse({
    status: 201,
    description:
      'The user notification settings have been updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User or Initiative not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async emailNotificationSettings(
    @Body() userNotificationSettingDto: UserNotificationSettingDto[],
    @UserToken() user: TokenDto,
  ) {
    return await this.userNotificationSettingsService.userNotificationSettings(
      userNotificationSettingDto,
      user,
    );
  }

  @Get('all')
  @ApiOperation({
    summary: 'Get all user notification settings for the logged-in user',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all user notification settings',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllUserNotificationSettings(@UserToken() user: TokenDto) {
    return await this.userNotificationSettingsService.getAllUserNotificationSettings(
      user,
    );
  }

  @Get(':initiativeId')
  @ApiOperation({ summary: 'Get user notification settings by initiative' })
  @ApiParam({
    name: 'initiativeId',
    description:
      'ID of the initiative for which to retrieve notification settings',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description:
      'Return user notification settings for the specified initiative',
  })
  @ApiResponse({
    status: 404,
    description: 'User or Initiative not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUserNotificationSettingsByInitiative(
    @Param('initiativeId') initiativeId: number,
    @UserToken() user: TokenDto,
  ) {
    return await this.userNotificationSettingsService.getUserNotificationSettingsByInitiative(
      initiativeId,
      user,
    );
  }
}
