import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
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
}
