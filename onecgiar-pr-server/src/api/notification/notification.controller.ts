import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateAnnouncementNotificationDto } from './dto/create-notification.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiHeader({
  name: 'auth',
  description: 'the token we need for auth.',
})
@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Create a new announcement notification' })
  @ApiResponse({
    status: 201,
    description: 'The notification has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post('new-anouncement')
  createAnouncement(
    @Body() createNotificationDto: CreateAnnouncementNotificationDto,
    @UserToken() user: TokenDto,
  ) {
    return this.notificationService.createAnouncement(
      createNotificationDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Retrieve all notifications for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of all notifications retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @Get('all-by-user')
  getAllNotifications(@UserToken() user: TokenDto) {
    return this.notificationService.getAllNotifications(user);
  }
}
