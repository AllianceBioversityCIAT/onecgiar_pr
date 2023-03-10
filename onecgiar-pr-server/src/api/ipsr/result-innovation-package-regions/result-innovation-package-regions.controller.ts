import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultInnovationPackageRegionsService } from './result-innovation-package-regions.service';
import { CreateResultInnovationPackageRegionDto } from './dto/create-result-innovation-package-region.dto';
import { UpdateResultInnovationPackageRegionDto } from './dto/update-result-innovation-package-region.dto';

@Controller('result-innovation-package-regions')
export class ResultInnovationPackageRegionsController {
  constructor(private readonly resultInnovationPackageRegionsService: ResultInnovationPackageRegionsService) {}

  @Post()
  create(@Body() createResultInnovationPackageRegionDto: CreateResultInnovationPackageRegionDto) {
    return this.resultInnovationPackageRegionsService.create(createResultInnovationPackageRegionDto);
  }

  @Get()
  findAll() {
    return this.resultInnovationPackageRegionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultInnovationPackageRegionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultInnovationPackageRegionDto: UpdateResultInnovationPackageRegionDto) {
    return this.resultInnovationPackageRegionsService.update(+id, updateResultInnovationPackageRegionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultInnovationPackageRegionsService.remove(+id);
  }
}
