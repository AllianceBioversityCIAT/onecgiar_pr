import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { EvidencesService } from './evidences.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FormDataJson } from '../../../shared/globalInterfaces/form-data-json.interface';
import { UserToken } from 'src/shared/decorators/user-token.decorator';
import { CreateUploadSessionDto } from './dto/create-upload-session.dto';
import { SharePointService } from '../../../shared/services/share-point/share-point.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class EvidencesController {
  constructor(
    private readonly evidencesService: EvidencesService,
    private readonly sharePointService: SharePointService,
  ) {}

  @Post('create/:resultId')
  @UseInterceptors(ResponseInterceptor, FilesInterceptor('files'))
  create(
    @Body() formDataJson: FormDataJson,
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
  ) {
    const createEvidenceDto: CreateEvidenceDto = JSON.parse(
      formDataJson.jsonData,
    );
    createEvidenceDto.result_id = resultId;

    return this.evidencesService.create(createEvidenceDto, user);
  }

  @Post('createUploadSession')
  async createUploadSession(
    @Body() createUploadSessionDto: CreateUploadSessionDto,
  ) {
    return await this.sharePointService.createUploadSession(
      createUploadSessionDto,
    );
  }

  @Get('get/:resultId')
  finEvidenceByResult(@Param('resultId') resultId: number) {
    return this.evidencesService.findAll(resultId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evidencesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEvidenceDto: UpdateEvidenceDto,
  ) {
    return this.evidencesService.update(+id, updateEvidenceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evidencesService.remove(+id);
  }
}
