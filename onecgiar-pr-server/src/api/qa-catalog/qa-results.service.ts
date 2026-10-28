// @akili-spec quality-assurance/qa-results-feed
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { QaResultsListResponse } from './dto/qa-results-response.dto';
import { QaResultsQueryDto } from './dto/qa-results-query.dto';
import { QaCatalogService } from './qa-catalog.service';
import { QaResultsRepository } from './qa-results.repository';

const LIST_ROUTE = '/api/qa/results';
/** What the caller sees when a read fails: never the driver text, which can carry SQL, tables or ids. */
const READ_FAILED_MESSAGE = 'The QA results could not be read';

/**
 * QRF-R-2 / R-4 / R-5 / R-6: the list feed. Eligibility, filtering, ordering and paging are the
 * repository's (QRF-DD-3..DD-5); this service owns the year check (404), the type-key check (400)
 * and the response assembly.
 */
@Injectable()
export class QaResultsService {
  private readonly logger = new Logger(QaResultsService.name);

  constructor(
    private readonly qaCatalogService: QaCatalogService,
    private readonly qaResultsRepository: QaResultsRepository,
  ) {}

  async list(query: QaResultsQueryDto): Promise<QaResultsListResponse> {
    const startedAt = Date.now();
    // Same 404 as `/api/qa/catalog` for a year with no catalog (QRF-R-2); also the key source below.
    const catalog = this.qaCatalogService.getCatalog(query.phase_year);
    this.assertKnownTypeKeys(
      query.result_type_keys,
      catalog.result_types.map((t) => t.key),
    );

    const [items, total, breakdown] = await this.readFeed(query);

    // QRF NFR: route, year, counts, duration - never ids, filters, values or the API key.
    this.logger.log(
      `route=${LIST_ROUTE} year=${query.phase_year} items=${items.length} eligible=${total} not_eligible=0 duration_ms=${Date.now() - startedAt}`,
    );

    return {
      phase: query.phase_year,
      page: query.page,
      page_size: query.page_size,
      total,
      breakdown,
      items,
    };
  }

  /** One filter object feeds page, count and breakdown, so `total` is over the FILTERED set (R-4). */
  private async readFeed(query: QaResultsQueryDto) {
    const filter = {
      phaseYear: query.phase_year,
      programIds: query.program_ids,
      resultTypeKeys: query.result_type_keys,
    };
    try {
      return await Promise.all([
        this.qaResultsRepository.findPage({
          ...filter,
          page: query.page,
          pageSize: query.page_size,
        }),
        this.qaResultsRepository.count(filter),
        this.qaResultsRepository.breakdown(filter),
      ]);
    } catch (error) {
      throw this.toGenericFailure(error, query.phase_year);
    }
  }

  /**
   * Design section 7 / NFR Security: a driver error carries SQL, table and column names, and the global
   * filter copies `exception.message` into the 500 body. Anything that is not already an HTTP error
   * becomes a generic 500; the log names the route and year (never the driver message, SQL or filters).
   */
  private toGenericFailure(error: unknown, phaseYear: number): HttpException {
    if (error instanceof HttpException) return error;
    this.logger.error(
      `route=${LIST_ROUTE} year=${phaseYear} read failed (${error instanceof Error ? error.constructor.name : typeof error})`,
    );
    return new InternalServerErrorException(READ_FAILED_MESSAGE);
  }

  /** QRF-R-4: a key absent from that year's catalog is a 400 that names it. */
  private assertKnownTypeKeys(requested: readonly string[], known: string[]) {
    const unknown = [...new Set(requested)].filter((k) => !known.includes(k));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown result_type_keys: ${unknown.join(', ')}`,
      );
    }
  }
}
