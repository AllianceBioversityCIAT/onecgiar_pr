// @akili-spec quality-assurance/qa-field-catalog
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { BilateralClarisaEndpoint } from '../bilateral/decorators/bilateral-clarisa-endpoint.decorator';
import { ExternalPlatform } from '../bilateral/decorators/external-platform.decorator';
import { ClarisaApiKeyGuard } from '../bilateral/guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationMis } from '../bilateral/interfaces/clarisa-api-key-validation.interface';
import { QaCatalogQueryDto } from './dto/qa-catalog-query.dto';
import { QaCatalogResponse } from './dto/qa-catalog-response.dto';
import { QaIntakeDto } from './dto/qa-intake.dto';
import {
  QaIntakeResponse,
  QaReleaseResponse,
} from './dto/qa-intake-response.dto';
import { QaReleaseDto } from './dto/qa-release.dto';
import { QaResultsDetailsDto } from './dto/qa-results-details.dto';
import { QaResultsQueryDto } from './dto/qa-results-query.dto';
import {
  QaResultsDetailsResponse,
  QaResultsListResponse,
} from './dto/qa-results-response.dto';
import { QaCatalogService } from './qa-catalog.service';
import { QA_INTAKE_ROUTE, QA_RELEASE_ROUTE } from './qa-intake.constants';
import { QaIntakeService } from './qa-intake.service';
import { QaResultsService } from './qa-results.service';

/**
 * QAC-R-9 / QAC-R-10. Service-to-service: authenticated with a CLARISA API key (`x-api-key`),
 * never the user JWT (the route is in the JwtMiddleware exclude list). No `ResponseInterceptor`:
 * the body is the agreed contract shape, not the `{response, statusCode, ...}` envelope.
 */
@Controller()
@ApiTags('QA catalog')
@ApiHeader({
  name: 'X-API-Key',
  required: true,
  description: 'CLARISA API key for the QA platform',
})
@UseGuards(ClarisaApiKeyGuard)
@SkipThrottle()
export class QaCatalogController {
  constructor(
    private readonly qaCatalogService: QaCatalogService,
    private readonly qaResultsService: QaResultsService,
    private readonly qaIntakeService: QaIntakeService,
  ) {}

  @Get('catalog')
  @BilateralClarisaEndpoint('/api/qa/catalog')
  @ApiOperation({ summary: 'Field catalog for one phase year' })
  getCatalog(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    )
    query: QaCatalogQueryDto,
  ): QaCatalogResponse {
    return this.qaCatalogService.getCatalog(query.phase_year);
  }

  /**
   * QRF-R-1 / R-2 / R-4 / R-5 / R-6. `phase_year` is required (no clock fallback); the
   * `@BilateralClarisaEndpoint` declaration is what the guard validates with CLARISA, without it
   * every call would be a 401 (P-1).
   */
  @Get('results')
  @BilateralClarisaEndpoint('/api/qa/results')
  @ApiOperation({
    summary: 'Submitted W1/W2 results of one phase year, paginated',
  })
  getResults(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    )
    query: QaResultsQueryDto,
  ): Promise<QaResultsListResponse> {
    return this.qaResultsService.list(query);
  }

  /**
   * QRF-R-1 / R-2 / R-7 / R-8 / R-9. A POST that reads (it answers 200, not 201); ineligible ids are part of the 200 body.
   * Same guard and per-endpoint declaration as the list; no `ResponseInterceptor`.
   */
  @Post('results/details')
  @HttpCode(200)
  @BilateralClarisaEndpoint('/api/qa/results/details')
  @ApiOperation({
    summary: 'Field values of a batch of submitted W1/W2 results',
  })
  getResultsDetails(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    )
    body: QaResultsDetailsDto,
  ): Promise<QaResultsDetailsResponse> {
    return this.qaResultsService.details(body);
  }

  /**
   * QIN-R-1 / R-2 / R-9 (QIN-DD-1). A write that answers 200 with every id in `taken` or `not_taken`. The calling platform
   * is the one CLARISA resolved from the key (`@ExternalPlatform()`), never a body field: `forbidNonWhitelisted` rejects a
   * `platform_id` sent by the caller. Same guard as the feed, its own permission string, no `ResponseInterceptor`.
   */
  @Post('results/intake')
  @HttpCode(200)
  @BilateralClarisaEndpoint(QA_INTAKE_ROUTE)
  @ApiOperation({
    summary:
      'Take a batch of submitted W1/W2 results into QA (marks them In QA)',
  })
  intakeResults(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: QaIntakeDto,
    @ExternalPlatform() platform: ClarisaApiKeyValidationMis,
  ): Promise<QaIntakeResponse> {
    return this.qaIntakeService.intake(body, platform);
  }

  /** QIN-R-1 / R-2 / R-9 (QIN-DD-1). Ends QA on a batch with an outcome per result (`qaed` / `not_qaed`). */
  @Post('results/release')
  @HttpCode(200)
  @BilateralClarisaEndpoint(QA_RELEASE_ROUTE)
  @ApiOperation({
    summary:
      'End QA on a batch of results: Quality Assessed (qaed) or back to the program (not_qaed)',
  })
  releaseResults(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: QaReleaseDto,
    @ExternalPlatform() platform: ClarisaApiKeyValidationMis,
  ): Promise<QaReleaseResponse> {
    return this.qaIntakeService.release(body, platform);
  }
}
