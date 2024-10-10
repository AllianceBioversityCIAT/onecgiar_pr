import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateAnnouncementNotificationDto } from './dto/create-notification.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

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
  @ApiResponse({
    status: 500,
    description: 'An error occurred while creating the notification.',
  })
  @Post('new-anouncement')
  createAnouncement(
    @Body() createNotificationDto: CreateAnnouncementNotificationDto,
    @UserToken() user: TokenDto,
  ) {
    return this.notificationService.emitApplicationAnouncement(
      createNotificationDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Update the read status of a notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification updated successfully',
  })
  @ApiResponse({
    status: 500,
    description:
      'An error occurred while updating the notification read status',
  })
  @Patch('read/:notificationId')
  updateReadStatus(
    @Param('notificationId') notificationId: number,
    @UserToken() user: TokenDto,
  ) {
    return this.notificationService.updateReadStatus(notificationId, user);
  }

  @ApiOperation({ summary: 'Update the read status of all notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications updated successfully',
  })
  @ApiResponse({
    status: 500,
    description:
      'An error occurred while updating the notifications read status',
  })
  @Patch('read-all')
  updateAllReadStatus(@UserToken() user: TokenDto) {
    return this.notificationService.updateAllReadStatus(user);
  }

  @ApiOperation({ summary: 'Retrieve all notifications for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of all notifications retrieved successfully.',
  })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while retrieving the notifications',
  })
  @Get('updates')
  getAllNotifications(@UserToken() user: TokenDto) {
    return this.notificationService.getAllNotifications(user);
  }

  @ApiOperation({ summary: 'Retrieve all notifications for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of all notifications retrieved successfully.',
  })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while retrieving the notifications',
  })
  @Get('updates-pop-up')
  getPopUpNotifications(@UserToken() user: TokenDto) {
    return this.notificationService.getPopUpNotifications(user);
  }
}
