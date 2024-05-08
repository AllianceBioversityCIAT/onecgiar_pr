import {
  Controller,
  Body,
  Patch,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Patch('submit/:resultId')
  @UseInterceptors(ResponseInterceptor)
  submit(
    @Param('resultId') resultId: number,
    @Body() createSubmissionDto: CreateSubmissionDto,
    @UserToken() user: TokenDto,
  ) {
    return this.submissionsService.submitFunction(
      resultId,
      user,
      createSubmissionDto,
    );
  }

  @Patch('submit-ipsr/:resultId')
  submitFunctionIPSR(
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    return this.submissionsService.submitFunctionIPSR(
      resultId,
      user,
      createSubmissionDto,
    );
  }

  @Patch('unsubmit/:resultId')
  unsubmit(
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    return this.submissionsService.unsubmitFunction(
      resultId,
      user,
      createSubmissionDto,
    );
  }

  @Patch('unsubmit-ipsr/:resultId')
  unsubmitFunctionIPSR(
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    return this.submissionsService.unsubmitFunctionIPSR(
      resultId,
      user,
      createSubmissionDto,
    );
  }
}
