import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { CreateClarisaCountryDto } from './dto/create-clarisa-country.dto';
import { UpdateClarisaCountryDto } from './dto/update-clarisa-country.dto';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaCountriesController {
  constructor(
    private readonly clarisaCountriesService: ClarisaCountriesService,
  ) {}

  @Post()
  create(@Body() createClarisaCountryDto: CreateClarisaCountryDto) {
    return this.clarisaCountriesService.create(createClarisaCountryDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaCountriesService.findAllCountries();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaCountriesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClarisaCountryDto: UpdateClarisaCountryDto,
  ) {
    return this.clarisaCountriesService.update(+id, updateClarisaCountryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaCountriesService.remove(+id);
  }
}
