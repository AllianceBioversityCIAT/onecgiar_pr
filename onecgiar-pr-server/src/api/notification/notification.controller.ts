import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateAnnouncementNotificationDto } from './dto/create-notification.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  decodeCursor,
  KEYSET_PAGE_SIZE,
} from '../../shared/utils/keyset-cursor.util';

@ApiTags('Notifications')
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
  @ApiQuery({
    name: 'version_id',
    required: false,
    type: Number,
    description:
      'Phase (result.version_id) to scope notifications to. Positive integer; omitted -> all phases (legacy behavior). Phase-less updates (e.g. bilateral AI-job-finished) are always included regardless of this value.',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['pending', 'history'],
    description:
      '"pending" returns only the pending set (notificationsPending/notificationAnnouncement), complete unless limit is sent (then paged, see limit); "history" returns only the paginated viewed page; omitted -> legacy shape (complete pending + first history page).',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description:
      "Opaque keyset cursor from a previous response's viewedMeta.nextCursor (history) or pendingMeta.nextCursor (scope=pending with limit), to fetch the next page. Never logged (.cursorrules).",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description:
      'Page size, integer 1..200. History (viewed) page size (BRS-DD-5) when scope is history/omitted (omitted -> 200). With scope=pending it switches pending to paged mode (<= limit rows newest first plus pendingMeta { hasMore, nextCursor, total }, PPG-R-4); without it pending stays the complete legacy set.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all notifications retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid version_id, cursor or limit.',
  })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while retrieving the notifications',
  })
  @Get('updates')
  getAllNotifications(
    @UserToken() user: TokenDto,
    @Query('version_id') versionId?: string,
    @Query('scope') scope?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    // PAGE-R-1/PAGE-T-3: validate up front so bad input is a 400 regardless of `scope`
    // (design.md §4.1) — validating only inside a scope branch would let `scope=pending`
    // skip the check entirely.
    const parsedVersionId = this.parseVersionId(versionId);
    const parsedLimit = this.parseLimit(limit);
    if (cursor !== undefined) {
      decodeCursor(cursor);
    }
    const parsedScope =
      scope === 'pending' || scope === 'history' ? scope : undefined;

    return this.notificationService.getAllNotifications(user, {
      versionId: parsedVersionId,
      scope: parsedScope,
      cursor,
      // Spread keeps the no-`limit` call shape identical to before (BRS-T-3 consumers).
      ...(parsedLimit !== undefined ? { limit: parsedLimit } : {}),
    });
  }

  /** BRS-T-3: absent -> undefined (service default 200); otherwise an integer in 1..200. */
  private parseLimit(limit?: string): number | undefined {
    if (limit === undefined || limit === null) {
      return undefined;
    }
    const parsed = limit.trim() === '' ? NaN : Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > KEYSET_PAGE_SIZE) {
      throw new BadRequestException('Invalid limit');
    }
    return parsed;
  }

  private parseVersionId(versionId?: string): number | undefined {
    if (versionId === undefined || versionId === null || versionId === '') {
      return undefined;
    }
    const parsed = Number(versionId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('Invalid version_id');
    }
    return parsed;
  }

  @ApiOperation({
    summary: 'Attention counts for the current user (bell badge)',
    description:
      'PPG-R-1: unseen/pending share requests and unread updates across all phases, computed with COUNT queries (no rows returned). Always scoped to the caller.',
  })
  @ApiOkResponse({
    description:
      'Counts retrieved: response = { unseenRequests, pendingRequests, unreadUpdates } (numbers).',
  })
  @ApiResponse({
    status: 500,
    description: 'An error occurred while retrieving the attention counts',
  })
  @Get('attention-counts')
  getAttentionCounts(@UserToken() user: TokenDto) {
    return this.notificationService.getAttentionCounts(user);
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

  @Get('recent-activity')
  @ApiOperation({
    summary: 'List recent result activity for the authenticated user',
    description: 'Returns the last eight notifications related to results.',
  })
  @ApiOkResponse({ description: 'Recent activity retrieved.' })
  getRecentActivity(
    @UserToken() user: TokenDto,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number(limit);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
    return this.notificationService.getRecentResultActivity(user, safeLimit);
  }
}
