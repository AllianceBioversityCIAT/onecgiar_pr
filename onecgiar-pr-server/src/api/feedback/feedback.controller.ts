import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { CreateFeedbackDto, MeTooFeedbackDto } from './dto/create-feedback.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @UserToken() user: TokenDto,
  ) {
    return this.feedbackService.createFeedback(createFeedbackDto, user);
  }

  /**
   * The current user's own reports, resolved live from Jira. Nothing about them
   * is stored on our side — see FeedbackService.findMyReports.
   */
  @Get('my-reports')
  myReports(@UserToken() user: TokenDto) {
    return this.feedbackService.findMyReports(user);
  }

  /** Existing reports that look like what the user is typing. */
  @Get('similar')
  similar(@Query('q') q: string) {
    return this.feedbackService.findSimilar(q);
  }

  /** "This happened to me too" — joins an existing report instead of duplicating it. */
  @Post('me-too')
  meToo(@Body() body: MeTooFeedbackDto, @UserToken() user: TokenDto) {
    return this.feedbackService.addMeToo(body?.issueKey, user);
  }
}
