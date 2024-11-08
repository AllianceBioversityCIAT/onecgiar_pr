import {
  Controller,
  Get,
  HttpStatus,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GreenchecksResponse } from './dto/get-validation-section-inno-pckg.dto';

@ApiTags('ResultsInnovationPackagesValidationModule')
@ApiHeader({
  name: 'auth',
  description: 'Auth token',
})
@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsInnovationPackagesValidationModuleController {
  constructor(
    private readonly resultsInnovationPackagesValidationModuleService: ResultsInnovationPackagesValidationModuleService,
  ) {}

  @ApiOperation({
    summary: 'Get green checks for a specific innovation package',
    description:
      'This endpoint retrieves and validates the green check sections for a given result and innovation package.',
  })
  @ApiParam({
    name: 'resultId',
    description: 'The ID of the result to validate',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully validated the sections',
    type: GreenchecksResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Result or Innovation package not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or data',
  })
  @Get('get/green-checks/:resultId')
  findAll(@Param('resultId') resultId: number) {
    return this.resultsInnovationPackagesValidationModuleService.getGreenchecksByinnovationPackage(
      resultId,
    );
  }
}
