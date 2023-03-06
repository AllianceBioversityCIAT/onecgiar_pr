import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultInnovationPackageService } from './result-innovation-package.service';
import { CreateResultInnovationPackageDto } from './dto/create-result-innovation-package.dto';
import { UpdateResultInnovationPackageDto } from './dto/update-result-innovation-package.dto';

@Controller('result-innovation-package')
export class ResultInnovationPackageController {
  constructor(private readonly resultInnovationPackageService: ResultInnovationPackageService) {}

  @Post()
  create(@Body() createResultInnovationPackageDto: CreateResultInnovationPackageDto) {
    return this.resultInnovationPackageService.create(createResultInnovationPackageDto);
  }

  @Get()
  findAll() {
    return this.resultInnovationPackageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultInnovationPackageService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultInnovationPackageDto: UpdateResultInnovationPackageDto) {
    return this.resultInnovationPackageService.update(+id, updateResultInnovationPackageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultInnovationPackageService.remove(+id);
  }
}
