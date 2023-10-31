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

@Controller()
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  @Post('create/:resultId')
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() formDataJson: FormDataJson,
    @Headers() auth: HeadersDto,
    @Param('resultId') resultId: number,
  ) {
    const createEvidenceDto: CreateEvidenceDto = JSON.parse(
      formDataJson.jsonData,
    );
    console.log(createEvidenceDto);
    createEvidenceDto.result_id = resultId;

    // console.log(files);
    // console.log(createEvidenceDto.jsonData);
    // createEvidenceDto: CreateEvidenceDto;
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } = await this.evidencesService.create(
      createEvidenceDto,
      token,
    );
    // return await this.evidencesService.createWithFiles(
    //   files,
    //   createEvidenceDto,
    // );

    // return createEvidenceDto;
    console.log(files);
    if (files?.length)
      await this.evidencesService.createFilesAndSaveInformation(
        files,
        createEvidenceDto,
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
