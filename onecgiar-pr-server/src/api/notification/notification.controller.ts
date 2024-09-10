import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateAnnouncementNotificationDto } from './dto/create-notification.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('new-anouncement')
  createAnouncement(
    @Body() createNotificationDto: CreateAnnouncementNotificationDto,
    @UserToken() user: TokenDto
  ) {
    return this.notificationService.createAnouncement(
      createNotificationDto,
      user,
    );
  }
}
