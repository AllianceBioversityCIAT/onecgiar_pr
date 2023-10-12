import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultInnovationPackageCountriesService } from './result-innovation-package-countries.service';
import { CreateResultInnovationPackageCountryDto } from './dto/create-result-innovation-package-country.dto';
import { UpdateResultInnovationPackageCountryDto } from './dto/update-result-innovation-package-country.dto';

@Controller('result-innovation-package-countries')
export class ResultInnovationPackageCountriesController {
  constructor(
    private readonly resultInnovationPackageCountriesService: ResultInnovationPackageCountriesService,
  ) {}

  @Post()
  create(
    @Body()
    createResultInnovationPackageCountryDto: CreateResultInnovationPackageCountryDto,
  ) {
    return this.resultInnovationPackageCountriesService.create(
      createResultInnovationPackageCountryDto,
    );
  }

  @Get()
  findAll() {
    return this.resultInnovationPackageCountriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultInnovationPackageCountriesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateResultInnovationPackageCountryDto: UpdateResultInnovationPackageCountryDto,
  ) {
    return this.resultInnovationPackageCountriesService.update(
      +id,
      updateResultInnovationPackageCountryDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultInnovationPackageCountriesService.remove(+id);
  }
}
