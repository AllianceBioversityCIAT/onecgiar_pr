// @akili-spec changes/replicated-innovation-reminders
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleEnum, RoleTypeEnum } from '../../shared/constants/role-type.enum';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ValidRoleGuard } from '../../shared/guards/valid-role.guard';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ReplicatedInnovationRemindersService } from './replicated-innovation-reminders.service';

const bodyPipe = () => new ValidationPipe({ whitelist: true, transform: true });

/**
 * `RIR-T-5` — admin API for the replicated-innovation reminder campaigns (design §4).
 * Every handler carries `@Roles(ADMIN, APPLICATION)` + `ValidRoleGuard` (`RIR-R-10`); the guard
 * reads the handler's own metadata, so a handler without the decorator is refused, not left open.
 */
@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('Replicated innovation reminders')
export class ReplicatedInnovationRemindersController {
  constructor(
    private readonly _service: ReplicatedInnovationRemindersService,
  ) {}

  @Get('campaigns')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({
    summary: 'Campaigns of the active Reporting phase with pending totals',
  })
  @ApiOkResponse({ description: 'Campaign list.' })
  @ApiResponse({ status: 404, description: 'No active Reporting phase.' })
  async list() {
    return this.ok('Campaigns', await this._service.list());
  }

  @Post('campaigns')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Schedule a campaign (future UTC date)' })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({ status: 201, description: 'Campaign created.' })
  @ApiResponse({ status: 400, description: 'Bad kind or non-future date.' })
  @ApiConflictResponse({
    description: 'A non-cancelled campaign of this kind exists.',
  })
  async create(
    @Body(bodyPipe()) dto: CreateCampaignDto,
    @UserToken() user: TokenDto,
  ) {
    return this.ok(
      'Campaign created',
      await this._service.create(dto, user?.id),
      HttpStatus.CREATED,
    );
  }

  @Patch('campaigns/:id')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Change the date of a PENDING campaign' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCampaignDto })
  @ApiConflictResponse({ description: 'The campaign is not PENDING.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(bodyPipe()) dto: UpdateCampaignDto,
    @UserToken() user: TokenDto,
  ) {
    return this.ok(
      'Campaign updated',
      await this._service.updateDate(id, dto, user?.id),
    );
  }

  @Patch('campaigns/:id/cancel')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Cancel a PENDING campaign' })
  @ApiParam({ name: 'id', type: Number })
  @ApiConflictResponse({ description: 'The campaign is not PENDING.' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @UserToken() user: TokenDto,
  ) {
    return this.ok(
      'Campaign cancelled',
      await this._service.cancel(id, user?.id),
    );
  }

  @Get('campaigns/:id/preview')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({
    summary: 'Dry run: who would be emailed. Sends nothing, writes nothing.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiConflictResponse({
    description:
      'The campaign is not PENDING/FAILED, or its phase is no longer active.',
  })
  async preview(@Param('id', ParseIntPipe) id: number) {
    return this.ok('Preview', await this._service.preview(id));
  }

  @Post('campaigns/:id/send')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Send now: dispatch the campaign immediately' })
  @ApiParam({ name: 'id', type: Number })
  @ApiConflictResponse({
    description:
      'SENDING/SENT/CANCELLED, claim lost, or phase no longer active.',
  })
  @ApiResponse({
    status: 412,
    description: 'Non-production without a test recipient.',
  })
  async send(@Param('id', ParseIntPipe) id: number) {
    return this.ok('Campaign dispatched', await this._service.send(id));
  }

  /** The `ResponseInterceptor` envelope reads `response`, `message` and `statusCode`. */
  private ok(message: string, response: unknown, statusCode = HttpStatus.OK) {
    return { response, message, statusCode };
  }
}
