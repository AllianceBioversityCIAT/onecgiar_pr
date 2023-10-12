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
import { ResultsValidationModuleService } from './results-validation-module.service';
import { CreateResultsValidationModuleDto } from './dto/create-results-validation-module.dto';
import { UpdateResultsValidationModuleDto } from './dto/update-results-validation-module.dto';

@Controller()
export class ResultsValidationModuleController {
  constructor(
    private readonly resultsValidationModuleService: ResultsValidationModuleService,
  ) {}

  @Post()
  create(
    @Body() createResultsValidationModuleDto: CreateResultsValidationModuleDto,
  ) {
    return this.resultsValidationModuleService.create(
      createResultsValidationModuleDto,
    );
  }

  @Get('get/green-checks/:resultId')
  async findAll(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.resultsValidationModuleService.getGreenchecksByResult(
        resultId,
      );
    throw new HttpException({ message, response }, status);
  }

  @Patch('save/green-checks/:resultId')
  async saveGreenChecks(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.resultsValidationModuleService.saveGreenCheck(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('bulk')
  async bulk() {
    const { message, response, status } =
      await this.resultsValidationModuleService.saveAllGreenCheck();
    throw new HttpException({ message, response }, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsValidationModuleService.remove(+id);
  }
}
