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
import { AssessedDuringExpertWorkshopService } from './assessed-during-expert-workshop.service';
import { CreateAssessedDuringExpertWorkshopDto } from './dto/create-assessed-during-expert-workshop.dto';
import { UpdateAssessedDuringExpertWorkshopDto } from './dto/update-assessed-during-expert-workshop.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class AssessedDuringExpertWorkshopController {
  constructor(
    private readonly assessedDuringExpertWorkshopService: AssessedDuringExpertWorkshopService,
  ) {}

  @Post()
  create(
    @Body()
    createAssessedDuringExpertWorkshopDto: CreateAssessedDuringExpertWorkshopDto,
  ) {
    return this.assessedDuringExpertWorkshopService.create(
      createAssessedDuringExpertWorkshopDto,
    );
  }

  @Get()
  findAll() {
    return this.assessedDuringExpertWorkshopService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessedDuringExpertWorkshopService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateAssessedDuringExpertWorkshopDto: UpdateAssessedDuringExpertWorkshopDto,
  ) {
    return this.assessedDuringExpertWorkshopService.update(
      +id,
      updateAssessedDuringExpertWorkshopDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assessedDuringExpertWorkshopService.remove(+id);
  }
}
