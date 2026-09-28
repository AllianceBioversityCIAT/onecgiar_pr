// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ProgressTrackerService } from './progress-tracker.service';
import { ProgressTrackerResolveService } from './progress-tracker-resolve.service';
import { PtResultsQueryDto } from './dto/pt-results-query.dto';
import { PtReadyCountsQueryDto } from './dto/pt-ready-counts-query.dto';
import { PtResolveTriggerDto } from './dto/pt-resolve-trigger.dto';

/**
 * `PTM-T-4` — the two read-only proxy routes over `ProgressTrackerService`
 * (`design.md` §4.1; `requirements.md` `PTM-R-1`, `PTM-R-2`, `PTM-R-6`; `PTM-AC-8`).
 *
 * `JwtMiddleware` and the global throttler are inherited from `api/*path` —
 * `progress-tracker` is not in `app.module.ts`'s exclusion list (`design.md` §1A
 * `P-7`). This controller adds **no** guard.
 *
 * Every query DTO is bound with an inline
 * `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })`,
 * the shape `results-knowledge-products.controller.ts:39-50` uses — a query param
 * outside the whitelist DTO is rejected with 400 before it can reach the upstream
 * (`PTM-R-6`, `PTM-AC-8`). Both service methods already return the house envelope
 * (`{ statusCode: 200, message, response: { status, ... } }`); it is returned
 * straight through to `ResponseInterceptor`, never re-wrapped or flattened.
 */
@Controller()
@UseInterceptors(ResponseInterceptor)
export class ProgressTrackerController {
  constructor(
    private readonly progressTrackerService: ProgressTrackerService,
    private readonly progressTrackerResolveService: ProgressTrackerResolveService,
  ) {}

  @ApiTags('Progress Tracker')
  @ApiOperation({
    summary: 'Progress Tracker proposals for one ToC indicator',
    description:
      'Resolves the PRMS/Integration `tocIndicatorId` to a Progress Tracker indicator through the server-side mapping and proxies its result proposals. Always answers HTTP 200 with a classified `status` (`ok` | `not_found` | `unavailable`) rather than propagating an upstream error status. Unknown query params are rejected with 400.',
  })
  @ApiParam({
    name: 'tocIndicatorId',
    description:
      'PRMS/Integration ToC indicator id (`related_node_id`) — never the Progress Tracker indicator id',
  })
  @Get('indicators/:tocIndicatorId/results')
  getIndicatorResults(
    @Param('tocIndicatorId') tocIndicatorId: string,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: PtResultsQueryDto,
  ) {
    return this.progressTrackerService.getIndicatorResults(
      tocIndicatorId,
      query,
    );
  }

  @ApiTags('Progress Tracker')
  @ApiOperation({
    summary: 'Progress Tracker ready counts for one program',
    description:
      'Proxies the upstream per-indicator evidence/cache counts for a program, filtered by `min_evidence`. Always answers HTTP 200 with a classified `status` (`ok` | `not_found` | `unavailable`). Unknown query params are rejected with 400.',
  })
  @ApiParam({
    name: 'programId',
    description: 'Program id or name, as the upstream accepts (Guide §4.3)',
  })
  @Get('programs/:programId/ready-counts')
  getProgramReadyCounts(
    @Param('programId') programId: string,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: PtReadyCountsQueryDto,
  ) {
    return this.progressTrackerService.getProgramReadyCounts(programId, query);
  }

  /**
   * `PTM-T-5` — the `/resolve` fill trigger (`design.md` §4.1 "fill trigger";
   * `requirements.md` `PTM-R-10`, `PTM-R-30`).
   *
   * 🛑 **JWT-gated, inherited — deliberately NOT modelled on
   * `clarisa-connections.controller.ts:17-18`**, which carries no guard at all
   * (`design.md` §12 `PTM-DD-3`, §1A `P-13`). This controller adds no `@UseGuards`
   * and no `app.module.ts` exclusion for this path — it sits under `/api` exactly
   * like the two read routes above, and `JwtMiddleware` applies the same way.
   */
  @ApiTags('Progress Tracker')
  @ApiOperation({
    summary:
      'Fill the Progress Tracker indicator mapping for one reporting version',
    description:
      'Calls the upstream /resolve once per ToC indicator row for the target reporting version (default: the active one) and upserts the mapping. `match: none` is recorded as an explicit unmapped row, never a guessed candidate. Re-runnable without duplicating rows.',
  })
  @Post('indicator-map/resolve')
  resolveIndicatorMap(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: PtResolveTriggerDto,
  ) {
    return this.progressTrackerResolveService.resolveIndicatorMappings(dto);
  }
}
