import { Controller, Get, Param } from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaInitiativesController {
  constructor(
    private readonly clarisaInitiativesService: ClarisaInitiativesService,
  ) {}

  @Get('get/all/without/result/:resultId')
  async getAllInitiativesWithoutCurrentInitiative(
    @Param('resultId') resultId: number,
  ) {
    const { message, response, status } =
      await this.clarisaInitiativesService.getAllInitiativesWithoutCurrentInitiative(
        resultId,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get()
  findAll() {
    return this.clarisaInitiativesService.findAll();
  }
}
