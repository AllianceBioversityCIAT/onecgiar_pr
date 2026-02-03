import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { RootResultsDto } from './dto/create-bilateral.dto';

@Controller()
@ApiTags('Bilaterals')
@UseInterceptors(ResponseInterceptor)
export class BilateralController {
  constructor(private readonly bilateralService: BilateralService) {}

  @Post('create')
  @ApiBody({ type: RootResultsDto })
  async create(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    body: RootResultsDto,
  ) {
    return this.bilateralService.create(body);
  }

  @Patch('update/:id')
  @ApiOperation({
    summary: 'Update bilateral result',
    description:
      'Updates an existing bilateral-created result. Body is identical to the create payload.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiBody({ type: RootResultsDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    body: RootResultsDto,
  ) {
    return this.bilateralService.update(id, body);
  }

  @Patch('delete/:id')
  @ApiOperation({
    summary: 'Soft delete bilateral result',
    description: 'Marks a bilateral-created result as inactive.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.bilateralService.delete(id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all bilateral results',
    description:
      'Retrieves all active bilateral results with all related data. Results are limited to 10 by default, but can be customized via the limit query parameter.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results to return (default: 10)',
    example: 10,
  })
  async findAll(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.bilateralService.findAll(limit);
  }

  @Get('results')
  @ApiOperation({
    summary: 'Get all bilateral results for synchronization',
    description:
      'Retrieves all active bilateral results for external synchronization. Returns results in the same structure as create/update endpoints. Supports optional filtering by bilateral flag and result type.',
  })
  @ApiQuery({
    name: 'bilateral',
    required: false,
    type: Boolean,
    description:
      'If true, only returns results that have associated contributing_bilateral_projects',
    example: true,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Filter results by specific result type',
    example: 'knowledge_product',
  })
  async getResults(
    @Query('bilateral') bilateral?: string,
    @Query('type') type?: string,
  ) {
    return this.bilateralService.getResultsForSync(bilateral === 'true', type);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get bilateral result by ID',
    description:
      'Retrieves a single bilateral result by its ID with all related data.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bilateralService.findOne(id);
  }
}
