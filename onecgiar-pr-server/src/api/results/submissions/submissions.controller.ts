import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, HttpException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Patch('submit/:resultId')
  async submit(
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto,
    @Body() createSubmissionDto: CreateSubmissionDto
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const {message,response, status} = await this.submissionsService.submitFunction(resultId, token, createSubmissionDto);
    throw new HttpException({ message, response }, status);
  }

  @Patch('submit-ipsr/:resultId')
  async submitFunctionIPSR(
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto,
    @Body() createSubmissionDto: CreateSubmissionDto
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const {message,response, status} = await this.submissionsService.submitFunctionIPSR(resultId, token, createSubmissionDto);
    throw new HttpException({ message, response }, status);
  }

  @Patch('unsubmit/:resultId')
  async unsubmit(
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto,
    @Body() createSubmissionDto: CreateSubmissionDto
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const {message,response, status} = await this.submissionsService.unsubmitFunction(resultId, token, createSubmissionDto);
    throw new HttpException({ message, response }, status);
  }

  @Patch('unsubmit-ipsr/:resultId')
  async unsubmitFunctionIPSR(
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto,
    @Body() createSubmissionDto: CreateSubmissionDto
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const {message,response, status} = await this.submissionsService.unsubmitFunctionIPSR(resultId, token, createSubmissionDto);
    throw new HttpException({ message, response }, status);
  }

  @Get('get')
  findAll() {
    return this.submissionsService.findAll();
  }

  @Get('get/:resultId')
  findOne(@Param('resultId') resultId: number) {
    return this.submissionsService.findOne(+resultId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSubmissionDto: UpdateSubmissionDto) {
    return this.submissionsService.update(+id, updateSubmissionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.submissionsService.remove(+id);
  }
}
