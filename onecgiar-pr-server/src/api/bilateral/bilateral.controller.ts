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
import { ListResultsQueryDto } from './dto/list-results-query.dto';

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

  @Get('list')
  @ApiOperation({
    summary: 'List all results with pagination and filters',
    description:
      'Returns all registered results with pagination (page, limit), filter by source (Result/W1/W2 or API/W3/Bilateral), portfolio acronym (e.g. P22, P25), phase year, status (id or name), dates (created/last_updated), leading center (id or acronym), initiative official_code (results where that initiative is the lead), and search by title. Limit is capped for robustness.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: ['Result', 'API'],
    description: 'Result (W1/W2) or API (W3/Bilateral)',
  })
  @ApiQuery({
    name: 'portfolio',
    required: false,
    type: String,
    description: 'Portfolio acronym (e.g. P22, P25)',
    example: 'P22',
  })
  @ApiQuery({
    name: 'phase_year',
    required: false,
    type: Number,
    description: 'Phase year (version.phase_year)',
    example: 2025,
  })
  @ApiQuery({
    name: 'result_type',
    required: false,
    enum: [
      'Policy change',
      'Innovation use',
      'Other outcome',
      'Capacity sharing for development',
      'Knowledge product',
      'Innovation development',
      'Other output',
      'Impact contribution',
      'Innovation Package',
    ],
    description: 'Result type name (result_type.name)',
    example: 'Knowledge product',
  })
  @ApiQuery({
    name: 'status_id',
    required: false,
    type: Number,
    description: 'Result status ID (1–7)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'Editing',
      'Quality Assessed',
      'Submitted',
      'Discontinued',
      'Pending Review',
      'Approved',
      'Rejected',
    ],
    description: 'Result status name (result_status.status_name)',
    example: 'Pending Review',
  })
  @ApiQuery({
    name: 'last_updated_from',
    required: false,
    type: String,
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'last_updated_to',
    required: false,
    type: String,
    example: '2026-01-02',
  })
  @ApiQuery({
    name: 'created_from',
    required: false,
    type: String,
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'created_to',
    required: false,
    type: String,
    example: '2026-01-02',
  })
  @ApiQuery({
    name: 'center',
    required: false,
    type: String,
    description: 'Leading center id (code) or acronym',
  })
  @ApiQuery({
    name: 'initiative_lead_code',
    required: false,
    type: String,
    description:
      'Initiative official_code: results where this initiative is the lead (role 1)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in result title',
  })
  async listAll(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    )
    query: ListResultsQueryDto,
  ) {
    return this.bilateralService.listAllResults(query);
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
