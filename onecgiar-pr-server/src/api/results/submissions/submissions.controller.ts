import {
  Controller,
  Body,
  Patch,
  Param,
  Headers,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Patch('submit/:resultId')
  @UseInterceptors(ResponseInterceptor)
  async submit(
    @Param('resultId') resultId: number,
    @Body() createSubmissionDto: CreateSubmissionDto,
    @UserToken() token: TokenDto,
  ) {
    return await this.submissionsService.submitFunction(
      resultId,
      token,
      createSubmissionDto,
    );
  }

  @Patch('submit-ipsr/:resultId')
  async submitFunctionIPSR(
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.submissionsService.submitFunctionIPSR(
        resultId,
        token,
        createSubmissionDto,
      );
    throw new HttpException({ message, response }, status);
  }

  @Patch('unsubmit/:resultId')
  async unsubmit(
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.submissionsService.unsubmitFunction(
        resultId,
        token,
        createSubmissionDto,
      );
    throw new HttpException({ message, response }, status);
  }

  @Patch('unsubmit-ipsr/:resultId')
  async unsubmitFunctionIPSR(
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.submissionsService.unsubmitFunctionIPSR(
        resultId,
        token,
        createSubmissionDto,
      );
    throw new HttpException({ message, response }, status);
  }
}
