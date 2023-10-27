import { Controller, Get } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaCountriesController {
  constructor(
    private readonly clarisaCountriesService: ClarisaCountriesService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaCountriesService.findAllCountries();
    throw new HttpException({ message, response }, status);
  }
}
