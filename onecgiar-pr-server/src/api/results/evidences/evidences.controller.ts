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
} from '@nestjs/common';
import { EvidencesService } from './evidences.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  @Post('create/:resultId')
  async create(
    @Body() createEvidenceDto: CreateEvidenceDto,
    @Headers() auth: HeadersDto,
    @Param('resultId') resultId: number
  ) {
    createEvidenceDto.result_id = resultId;
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.evidencesService.create(createEvidenceDto, token);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/:resultId')
  finEvidenceByResult(
    @Param('resultId') resultId: number
  ) {
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
