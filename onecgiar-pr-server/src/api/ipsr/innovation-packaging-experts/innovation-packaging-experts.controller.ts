import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { InnovationPackagingExpertsService } from './innovation-packaging-experts.service';
import { CreateInnovationPackagingExpertDto } from './dto/create-innovation-packaging-expert.dto';
import { UpdateInnovationPackagingExpertDto } from './dto/update-innovation-packaging-expert.dto';

@Controller()
export class InnovationPackagingExpertsController {
  constructor(private readonly innovationPackagingExpertsService: InnovationPackagingExpertsService) {}

  @Post()
  create(@Body() createInnovationPackagingExpertDto: CreateInnovationPackagingExpertDto) {
    return this.innovationPackagingExpertsService.create(createInnovationPackagingExpertDto);
  }

  @Get()
  findAll() {
    return this.innovationPackagingExpertsService.findAll();
  }

  @Get('expertises')
  async findAllExpertises() {
    const { message, response, status } =
      await  this.innovationPackagingExpertsService.findAllExpertises();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.innovationPackagingExpertsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInnovationPackagingExpertDto: UpdateInnovationPackagingExpertDto) {
    return this.innovationPackagingExpertsService.update(+id, updateInnovationPackagingExpertDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.innovationPackagingExpertsService.remove(+id);
  }
}
