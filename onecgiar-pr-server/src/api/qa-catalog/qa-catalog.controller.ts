// @akili-spec quality-assurance/qa-field-catalog
import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { BilateralClarisaEndpoint } from '../bilateral/decorators/bilateral-clarisa-endpoint.decorator';
import { ClarisaApiKeyGuard } from '../bilateral/guards/clarisa-api-key.guard';
import { QaCatalogQueryDto } from './dto/qa-catalog-query.dto';
import { QaCatalogResponse } from './dto/qa-catalog-response.dto';
import { QaCatalogService } from './qa-catalog.service';

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
  constructor(private readonly qaCatalogService: QaCatalogService) {}

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
}
