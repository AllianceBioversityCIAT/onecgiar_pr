import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { BilateralAiService } from './services/bilateral-ai.service';
import { CreateBilateralAiJobDto } from './dto/create-bilateral-ai-job.dto';

@Controller('center/ai')
@ApiTags('Bilateral Center AI')
@UseInterceptors(ResponseInterceptor)
export class BilateralAiController {
  constructor(private readonly bilateralAiService: BilateralAiService) {}

  @Post('jobs')
  @HttpCode(202)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'documents', maxCount: 6 },
      { name: 'audio', maxCount: 6 },
    ]),
  )
  createJob(
    @Body() dto: CreateBilateralAiJobDto,
    @UploadedFiles()
    files: { documents?: any[]; audio?: any[] },
    @UserToken() user: TokenDto,
  ) {
    return this.bilateralAiService.createJob(
      dto,
      files?.documents ?? [],
      files?.audio ?? [],
      user,
    );
  }

  @Get('files/signed-url')
  @ApiOperation({ summary: 'Generate presigned URL for a bilateral AI file' })
  @ApiQuery({ name: 'key', required: true, type: String })
  getSignedUrl(@Query('key') key: string, @UserToken() user: TokenDto) {
    return this.bilateralAiService.getSignedUrl(key, user);
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string, @UserToken() user: TokenDto) {
    return this.bilateralAiService.getJob(jobId, user.id);
  }

  @Get('drafts')
  listDrafts(@UserToken() user: TokenDto) {
    return this.bilateralAiService.listDrafts(user.id);
  }

  @Get('drafts/:draftId')
  getDraft(
    @Param('draftId', ParseIntPipe) draftId: number,
    @UserToken() user: TokenDto,
  ) {
    return this.bilateralAiService.getDraft(draftId, user.id);
  }

  @Patch('drafts/:draftId/evidence/:evidenceId')
  setFormalEvidence(
    @Param('draftId', ParseIntPipe) draftId: number,
    @Param('evidenceId', ParseIntPipe) evidenceId: number,
    @Body() body: { is_formal_evidence: boolean },
    @UserToken() user: TokenDto,
  ) {
    return this.bilateralAiService.setFormalEvidence(
      draftId,
      evidenceId,
      body.is_formal_evidence === true,
      user.id,
    );
  }

  @Post('drafts/:draftId/promote')
  promoteDraft(
    @Param('draftId', ParseIntPipe) draftId: number,
    @UserToken() user: TokenDto,
  ) {
    return this.bilateralAiService.promoteDraft(draftId, user.id);
  }

  @Delete('drafts/:draftId')
  discardDraft(
    @Param('draftId', ParseIntPipe) draftId: number,
    @UserToken() user: TokenDto,
  ) {
    return this.bilateralAiService.discardDraft(draftId, user.id);
  }
}
