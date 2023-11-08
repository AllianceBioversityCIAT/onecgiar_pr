import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  HttpException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { EvidencesService } from './evidences.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FormDataJson } from '../../../shared/globalInterfaces/form-data-json.interface';
import { UserToken } from 'src/shared/decorators/user-token.decorator';

@Controller()
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  @Post('create/:resultId')
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() formDataJson: FormDataJson,
    @Headers() auth: HeadersDto,
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
  ) {
    const createEvidenceDto: CreateEvidenceDto = JSON.parse(
      formDataJson.jsonData,
    );
    createEvidenceDto.result_id = resultId;

    const { message, response, status } = await this.evidencesService.create(
      createEvidenceDto,
      files,
      user,
    );

    throw new HttpException({ message, response }, status);
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
