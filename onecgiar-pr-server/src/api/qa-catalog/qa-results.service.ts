// @akili-spec quality-assurance/qa-results-feed
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatalogField } from './definitions/types';
import { isValidIn } from './definitions/validity';
import { QaResultsDetailsDto } from './dto/qa-results-details.dto';
import {
  QaResultsDetailsItem,
  QaResultsDetailsResponse,
  QaResultsListResponse,
  QaResultsNotEligible,
} from './dto/qa-results-response.dto';
import { QaResultsQueryDto } from './dto/qa-results-query.dto';
import {
  CODE_CATALOG,
  QaCatalogService,
  QaCatalogSource,
} from './qa-catalog.service';
import { QaResultsRepository } from './qa-results.repository';
import { normalize } from './values/normalizers';
import { resolveElementPaths, resolvePathFields } from './values/path.resolver';
import { project } from './values/projection';
import { resolveLookups } from './values/lookup.resolver';
import {
  PlanQueryRunner,
  PlanReadError,
  dataSourceRunner,
} from './values/read-plan';
import { TableKeys, entityTableKeys } from './values/table-metadata';
import { readBaseValues } from './values/value-reader';

/** Test seam: the catalog source (with storage bindings), the statement runner, the table metadata and the lookup environment. */
export interface DetailsDeps {
  source?: QaCatalogSource;
  run?: PlanQueryRunner;
  keys?: TableKeys;
  env?: Record<string, string | undefined>;
}

const LIST_ROUTE = '/api/qa/results';
const DETAILS_ROUTE = '/api/qa/results/details';
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
  private tableKeys?: TableKeys;

  constructor(
    private readonly qaCatalogService: QaCatalogService,
    private readonly qaResultsRepository: QaResultsRepository,
    private readonly dataSource: DataSource,
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

  /**
   * QRF-R-7 / R-8 / R-9: details of a batch. Ineligible ids go to `not_eligible` and never fail the batch. Only the fields the
   * batch needs are read (union of the eligible results' types, narrowed to `field_keys`, DD-11); the statement count depends on
   * those fields, never on the number of results (QRF NFR *Query shape*). `deps` is the test seam of `getCatalog(year, source)`.
   */
  async details(
    body: QaResultsDetailsDto,
    deps: DetailsDeps = {},
  ): Promise<QaResultsDetailsResponse> {
    const startedAt = Date.now();
    const source = deps.source ?? CODE_CATALOG;
    const year = body.phase_year;
    // Same 404 as `/api/qa/catalog`; `catalog_version` and the top-level keys come from the same projection (QRF-R-7).
    const catalog = this.qaCatalogService.getCatalog(year, source);
    const catalogOrder = new Map(catalog.fields.map((f, i) => [f.key, i]));
    this.assertKnownFieldKeys(body.field_keys, catalogOrder);

    let statements = 0;
    const baseRun = deps.run ?? dataSourceRunner(this.dataSource);
    const run: PlanQueryRunner = (query) => {
      statements += 1;
      return baseRun(query);
    };

    const classified = await this.guarded(year, async () => {
      statements += 1;
      return this.qaResultsRepository.classify(body.result_ids, year);
    });
    const eligible = classified.filter((c) => c.reason === null);
    const notEligible = classified.flatMap((c): QaResultsNotEligible[] =>
      c.reason === null ? [] : [{ result_id: c.result_id, reason: c.reason }],
    );

    const requested = body.field_keys ? new Set(body.field_keys) : null;
    const typeKeys = new Set(eligible.map((c) => c.result_type_key));
    const applies = (f: CatalogField, typeKey: string) =>
      f.result_types.includes('*') || f.result_types.includes(typeKey);
    // fields of THIS year (the catalog's own validity rule), selected, and applicable to some eligible type
    const selected = source.fields
      .filter(
        (f) =>
          catalogOrder.has(f.key) &&
          isValidIn(f, year) &&
          (!requested || requested.has(f.key)),
      )
      .sort((a, b) => catalogOrder.get(a.key) - catalogOrder.get(b.key));
    const toRead = selected.filter((f) =>
      [...typeKeys].some((t) => applies(f, t)),
    );

    const values = await this.guarded(year, () =>
      this.readValues(
        toRead,
        eligible.map((c) => c.result_id),
        year,
        run,
        deps,
      ),
    );

    const results: QaResultsDetailsItem[] = eligible.map((c) => {
      const own = values.get(c.result_id) ?? {};
      const out: Record<string, unknown> = {};
      for (const f of toRead) {
        if (applies(f, c.result_type_key)) {
          out[f.key] = project(f, normalize(f.key, own[f.key]));
        }
      }
      return {
        result_id: c.result_id,
        result_code: c.result_code,
        result_type_key: c.result_type_key,
        values: out,
      };
    });

    // QRF NFR: route, year, counts, statements, duration - never ids, field keys, values or the API key.
    this.logger.log(
      `route=${DETAILS_ROUTE} year=${year} eligible=${results.length} not_eligible=${notEligible.length} statements=${statements} duration_ms=${Date.now() - startedAt}`,
    );
    return {
      phase: year,
      catalog_version: catalog.catalog_version,
      results,
      not_eligible: notEligible,
    };
  }

  /** Base plans, then paths, then lookups (QRF-DD-6 / DD-8): each step reads what the one before left in `deferred`. */
  private async readValues(
    fields: CatalogField[],
    ids: number[],
    phaseYear: number,
    run: PlanQueryRunner,
    deps: DetailsDeps,
  ) {
    if (fields.length === 0 || ids.length === 0) {
      return new Map<number, Record<string, unknown>>();
    }
    const keys = deps.keys ?? (this.tableKeys ??= entityTableKeys());
    const base = await readBaseValues(fields, ids, { run, keys });
    const paths = await resolvePathFields(fields, ids, { run, keys });
    for (const [id, own] of paths.values)
      Object.assign(base.values.get(id), own);
    base.deferred.push(...paths.deferred);
    await resolveElementPaths(fields, base, { run, keys });
    await resolveLookups(fields, base, { run, phaseYear, env: deps.env });
    return base.values;
  }

  /** QRF-R-7: a `field_keys` entry that is not a top-level key of the year's catalog (a subfield key included) is a 400. */
  private assertKnownFieldKeys(
    requested: readonly string[] | undefined,
    known: ReadonlyMap<string, number>,
  ) {
    const unknown = [...new Set(requested ?? [])].filter((k) => !known.has(k));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown field_keys: ${unknown.join(', ')}`,
      );
    }
  }

  /** One filter object feeds page, count and breakdown, so `total` is over the FILTERED set (R-4). */
  private async readFeed(query: QaResultsQueryDto) {
    const filter = {
      phaseYear: query.phase_year,
      programIds: query.program_ids,
      resultTypeKeys: query.result_type_keys,
    };
    return this.guarded(
      query.phase_year,
      () =>
        Promise.all([
          this.qaResultsRepository.findPage({
            ...filter,
            page: query.page,
            pageSize: query.page_size,
          }),
          this.qaResultsRepository.count(filter),
          this.qaResultsRepository.breakdown(filter),
        ]),
      LIST_ROUTE,
    );
  }

  /** The one generic-failure boundary around a read (design section 7): nothing the driver says leaves it. */
  private async guarded<T>(
    phaseYear: number,
    read: () => Promise<T>,
    route = DETAILS_ROUTE,
  ): Promise<T> {
    try {
      return await read();
    } catch (error) {
      throw this.toGenericFailure(error, phaseYear, route);
    }
  }

  /**
   * Design section 7 / NFR Security: a driver error carries SQL, table and column names, and the global
   * filter copies `exception.message` into the 500 body. Anything that is not already an HTTP error
   * becomes a generic 500; the log names the route, year, error class and, when a read plan failed, the catalog
   * field keys of that plan (section 9) - never the driver message, SQL, ids, values or filters.
   */
  private toGenericFailure(
    error: unknown,
    phaseYear: number,
    route: string,
  ): HttpException {
    if (error instanceof HttpException) return error;
    const plan = error instanceof PlanReadError ? error : null;
    const kind =
      plan?.causeName ??
      (error instanceof Error ? error.constructor.name : typeof error);
    this.logger.error(
      `route=${route} year=${phaseYear} read failed (${kind})${plan ? ` fields=${plan.fieldKeys.join(',')}` : ''}`,
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
