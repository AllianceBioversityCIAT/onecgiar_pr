import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { OstMeliaStudiesService } from './ost-melia-studies.service';
import { CreateOstMeliaStudyDto } from './dto/create-ost-melia-study.dto';
import { UpdateOstMeliaStudyDto } from './dto/update-ost-melia-study.dto';

@Controller()
export class OstMeliaStudiesController {
  constructor(
    private readonly ostMeliaStudiesService: OstMeliaStudiesService,
  ) {}

  @Get('get/all/result/:resultId')
  async getMeliaStudiesFromResultId(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.ostMeliaStudiesService.getMeliaStudiesFromResultId(resultId);
    throw new HttpException({ message, response }, status);
  }
}
