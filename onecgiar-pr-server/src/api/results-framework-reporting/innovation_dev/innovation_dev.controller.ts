import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Version,
  UseInterceptors,
  Post,
} from '@nestjs/common';
import { InnovationDevService } from './innovation_dev.service';
import { CreateInnovationDevDtoV2 } from './dto/create-innovation_dev_v2.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { InnovationUseDto } from '../../results/summary/dto/create-innovation-use.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ApiTags } from '@nestjs/swagger';
import { CreateUploadSessionDto } from '../../results/evidences/dto/create-upload-session.dto';
import { SharePointService } from '../../../shared/services/share-point/share-point.service';
import { FormDataJson } from '../../../shared/globalInterfaces/form-data-json.interface';
import { CreateEvidenceDto } from '../../results/evidences/dto/create-evidence.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { EvidencesService } from '../../results/evidences/evidences.service';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('Results Framework and Reporting - Innovation Development')
export class InnovationDevController {
  constructor(
    private readonly innovationDevService: InnovationDevService,
    private readonly sharePointService: SharePointService,
    private readonly evidencesService: EvidencesService,
  ) {}

  @Version('2')
  @Post('evidence_demand/createUploadSession')
  async createUploadSession(
    @Body() createUploadSessionDto: CreateUploadSessionDto,
  ) {
    return await this.sharePointService.createUploadSession(
      createUploadSessionDto,
    );
  }

  @Version('2')
  @Post('evidence_demand/create/:resultId')
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

    return this.evidencesService.createV2(createEvidenceDto, user);
  }

  @Version('2')
  @Get('evidence_demand/:resultId')
  findEvidenceByResult(@Param('resultId') resultId: number) {
    return this.evidencesService.findAllV2(resultId);
  }

  @Version('2')
  @Patch('innovation-dev/create/result/:resultId')
  saveInnovationDev(
    @Param('resultId') resultId: number,
    @Body() createInnovationDevDto: CreateInnovationDevDtoV2,
    @Body() innovationUseDto: InnovationUseDto,
    @UserToken() user: TokenDto,
  ) {
    return this.innovationDevService.saveInnovationDev(
      createInnovationDevDto,
      innovationUseDto,
      resultId,
      user,
    );
  }

  @Version('2')
  @Get('innovation-dev/get/result/:resultId')
  getInnovationDev(@Param('resultId') resultId: number) {
    return this.innovationDevService.getInnovationDev(resultId);
  }
}
