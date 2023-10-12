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
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';
import { CreateResultsInnovationPackagesValidationModuleDto } from './dto/create-results-innovation-packages-validation-module.dto';
import { UpdateResultsInnovationPackagesValidationModuleDto } from './dto/update-results-innovation-packages-validation-module.dto';

@Controller()
export class ResultsInnovationPackagesValidationModuleController {
  constructor(
    private readonly resultsInnovationPackagesValidationModuleService: ResultsInnovationPackagesValidationModuleService,
  ) {}

  @Get('get/green-checks/:resultId')
  async findAll(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.resultsInnovationPackagesValidationModuleService.getGreenchecksByinnovationPackage(
        resultId,
      );

    throw new HttpException({ message, response }, status);
  }
}
