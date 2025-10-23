import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DataSource, DeepPartial } from 'typeorm';
import { ClarisaApiConnection } from './clarisa.connection';
import { ClarisaEndpoints } from './clarisa-endpoints.enum';
import { ClarisaInitiativesRepository } from './clarisa-initiatives/ClarisaInitiatives.repository';
import { CgiarEntityInitiativeDto } from './dtos/clarisa-initiative.dto';
import { ClarisaInitiative } from './clarisa-initiatives/entities/clarisa-initiative.entity';
import { ClarisaInstitutionsRepository } from './clarisa-institutions/ClariasaInstitutions.repository';
import { TocResultsRepository } from '../toc/toc-results/toc-results.repository';
import { ClarisaInitiativeStageRepository } from './clarisa-initiative-stage/repositories/clarisa-initiative-stage.repository';
import { ClarisaGlobalUnitRepository } from './clarisa-global-unit/clarisa-global-unit.repository';
import { ClarisaGlobalUnitLineageRepository } from './clarisa-global-unit/clarisa-global-unit-lineage.repository';
import { ClarisaGlobalUnitDto } from './dtos/clarisa-global-unit.dto';
import { ClarisaGlobalUnit } from './clarisa-global-unit/entities/clarisa-global-unit.entity';
import {
  ClarisaGlobalUnitLineage,
  ClarisaGlobalUnitLineageRelationType,
} from './clarisa-global-unit/entities/clarisa-global-unit-lineage.entity';

@Injectable()
export class ClarisaTaskService {
  private readonly _logger: Logger = new Logger(ClarisaTaskService.name);
  private clarisaConnection: ClarisaApiConnection;

  constructor(
    private readonly dataSource: DataSource,
    private readonly _httpService: HttpService,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _clarisaInitiativeStageRepository: ClarisaInitiativeStageRepository,
    private readonly _clarisaGlobalUnitRepository: ClarisaGlobalUnitRepository,
    private readonly _clarisaGlobalUnitLineageRepository: ClarisaGlobalUnitLineageRepository,
    private readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly _tocResultsRepository: TocResultsRepository,
  ) {
    this.clarisaConnection = new ClarisaApiConnection(this._httpService);
  }

  /**
   * Synchronizes a control list by fetching data from the CLARISA API and saving it to the database.
   *
   * @template Entity - The type of the entity to be saved.
   * @template Dto - The type of the data transfer object received from the CLARISA API.
   * @param {ClarisaEndpoints<Entity, Dto>} controlList - The control list containing the endpoint details and mapping function.
   * @param {number} index - The index of the control list, used for logging purposes.
   * @returns {Promise<Entity[]>} - A promise that resolves to the saved entities.
   *
   * @throws Will log an error if fetching data from the CLARISA API fails.
   * @throws Will log an error if saving data to the database fails.
   */
  private async syncControlList<Entity, Dto>(
    controlList: ClarisaEndpoints<Entity, Dto>,
    index: number,
  ): Promise<Entity[]> {
    this._logger.log(
      `>>>[${index}] Fetching data from CLARISA API for ${controlList.entity.name}`,
    );

    const data: Dto[] = await this.clarisaConnection
      .get<Dto[]>(controlList.path, { params: controlList.params })
      .catch((err) => {
        this._logger.error(
          `[${index}] Error fetching data from CLARISA API for ${controlList.entity.name} path: ${controlList.path}`,
        );
        this._logger.error(err);
        return [];
      });

    let transformedData: DeepPartial<Entity>[];
    if (controlList.mapper) {
      transformedData = controlList.mapper(data);
    } else {
      transformedData = data as unknown as Entity[];
    }

    const repo = this.dataSource.getRepository(controlList.entity);
    const results: Entity[] = [];

    for (const item of transformedData) {
      try {
        const saved = await repo.save(item);
        results.push(saved);
      } catch (err) {
        this._logger.error(
          `[${index}] Error saving item with id/code: ${item['id'] || item['code']}`,
        );
        this._logger.error(err);
      }
    }

    this._logger.log(
      `[${index}] Data successfully saved for ${controlList.entity.name}!`,
    );
    return results;
  }

  public async clarisaBootstrapImportantData() {
    this._logger.debug(`Cloning of CLARISA important control lists`);
    const lastUpdated = (
      await this._clarisaInstitutionsRepository.getMostRecentLastUpdated()
    )[0]?.most_recent;
    const institutionsPartial = ClarisaEndpoints.INSTITUTIONS_FULL;
    if (lastUpdated) {
      institutionsPartial.params = {
        ...institutionsPartial.params,
        from: lastUpdated,
      };
    }

    return this.syncControlList(institutionsPartial, 1).then((data) => {
      this._logger.debug(
        `All CLARISA Institutions control list data has been created. Updated/created ${
          data.length ?? 0
        } institutions`,
      );
    });
  }

  /**
   * Bootstraps the CLARISA control lists by synchronizing various endpoints.
   *
   * This method performs the following actions:
   * - Logs the start of the cloning process.
   * - Defines a list of asynchronous functions to synchronize different control lists.
   * - Executes each function in the list, capturing the results and handling any errors.
   * - Logs the completion of the cloning process.
   *
   * @returns {Promise<PromiseSettledResult<unknown>[]>} A promise that resolves to an array of results,
   * each indicating whether the corresponding control list synchronization was fulfilled or rejected.
   */
  async clarisaBootstrap(): Promise<PromiseSettledResult<unknown>[]> {
    this._logger.debug(`Cloning of CLARISA control lists`);

    const controlListsPromise: ((index: number) => Promise<unknown[]>)[] = [
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.UN_REGIONS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.COUNTRIES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.MELIA_STUDY_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.ACTION_AREAS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.PORTFOLIO, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.PROJECTS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.CGIAR_ENTITY_TYPES, index);
      },
      async (index: number) => {
        return this.syncGlobalUnits(index);
      },
      async (index: number) => {
        return this.syncInitiatives(index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.IMPACT_AREAS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.GLOBAL_TARGETS, index);
      },
      async (index: number) => {
        return this.syncControlList(
          ClarisaEndpoints.IMPACT_AREA_INDICATORS,
          index,
        );
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.OUTCOME_INDICATORS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.REGION_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.INSTITUTION_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.POLICY_STAGES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.INNOVATION_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(
          ClarisaEndpoints.INNOVATION_READINESS_LEVELS,
          index,
        );
      },
      async (index: number) => {
        return this.syncControlList(
          ClarisaEndpoints.INNOVATION_CHARACTERISTICS,
          index,
        );
      },
      async (index: number) => {
        return this.syncControlList(
          ClarisaEndpoints.ACTION_AREA_OUTCOMES,
          index,
        );
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.GEOSCOPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.CGIAR_ENTITIES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.POLICY_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.SDGS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.SDG_TARGETS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.TOC_PHASES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.SUBNATIONAL_SCOPES, index);
      },
    ];

    const results: PromiseSettledResult<unknown>[] = [];

    for (const [index, promise] of controlListsPromise.entries()) {
      try {
        const result = await promise(index + 1);
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
    }

    this._logger.debug('All CLARISA control lists have been created');

    return results;
  }

  async tocDBBootstrap() {
    this._logger.debug(`Cloning of ToC Results from ToC Integration DB`);

    return this.cloneResultTocRepository(1);
  }

  private async syncGlobalUnits(index: number): Promise<ClarisaGlobalUnit[]> {
    const endpoint = ClarisaEndpoints.GLOBAL_UNITS;

    this._logger.log(
      `>>>[${index}] Fetching data from CLARISA API for ${endpoint.entity.name}`,
    );

    const data: ClarisaGlobalUnitDto[] = await this.clarisaConnection
      .get<ClarisaGlobalUnitDto[]>(endpoint.path, { params: endpoint.params })
      .catch((err) => {
        this._logger.error(
          `[${index}] Error fetching data from CLARISA API for ${endpoint.entity.name} path: ${endpoint.path}`,
        );
        this._logger.error(err);
        return [];
      });

    if (!data.length) {
      this._logger.warn(
        `[${index}] No data received for ${endpoint.entity.name}. Skipping without lineage deletions.`,
      );
      return [];
    }

    const sortedData = [...data].sort(
      (a, b) => (a.level ?? 0) - (b.level ?? 0),
    );

    let createdOrUpdated = 0;
    let parentLinksUpdated = 0;
    let lineageInserted = 0;
    let skippedNoCode = 0;
    let unresolvedParents = 0;
    let unresolvedFromRefs = 0;
    let deactivated = 0;
    let reactivated = 0;

    const savedUnits = await this.dataSource.transaction(async (manager) => {
      const globalUnitRepo = manager.getRepository(ClarisaGlobalUnit);
      const lineageRepo = manager.getRepository(ClarisaGlobalUnitLineage);

      const existingUnits = await globalUnitRepo.find();
      const unitsByKey = new Map<string, ClarisaGlobalUnit>();
      const unitsByCode = new Map<string, ClarisaGlobalUnit[]>();
      const processedUnitIds = new Set<number>();

      const registerInCodeIndex = (
        unit: ClarisaGlobalUnit,
        previousCodeKey?: string | null,
      ) => {
        if (previousCodeKey) {
          const prevList = unitsByCode.get(previousCodeKey);
          if (prevList) {
            const idx = prevList.findIndex((x) => x.id === unit.id);
            if (idx >= 0) {
              prevList.splice(idx, 1);
              if (!prevList.length) unitsByCode.delete(previousCodeKey);
            }
          }
        }
        const codeKey = this.normalizeIdentifier(unit.code) || '__NO_CODE__';
        const list = unitsByCode.get(codeKey);
        if (list) {
          const idx = list.findIndex((x) => x.id === unit.id);
          if (idx >= 0) list[idx] = unit;
          else list.push(unit);
        } else {
          unitsByCode.set(codeKey, [unit]);
        }
      };

      const IGNORED_YEAR_ENTITY_TYPES = new Set<number>([22, 23, 24]);
      const buildIndexKey = (
        composeCode?: string | null,
        year?: number | null,
        code?: string | null,
        entityTypeId?: number | null,
      ): string => {
        const effectiveYear =
          entityTypeId && IGNORED_YEAR_ENTITY_TYPES.has(entityTypeId)
            ? null
            : (year ?? null);
        return this.buildGlobalUnitKey(composeCode, effectiveYear, code);
      };

      for (const u of existingUnits) {
        const key = buildIndexKey(
          u.composeCode,
          u.year,
          u.code,
          u.entityTypeId,
        );
        unitsByKey.set(key, u);
        registerInCodeIndex(u);
      }

      const toUpsert: ClarisaGlobalUnit[] = [];

      for (const item of sortedData) {
        const composeCode =
          this.normalizeOptionalString(item.compose_code) ??
          this.normalizeOptionalString(item.code);
        const code = this.normalizeOptionalString(item.code);
        const year = this.normalizeYear(item.year);

        if (!composeCode || !code) {
          skippedNoCode++;
          this._logger.warn(
            `[${index}] Skipping global unit without compose_code/code: ${JSON.stringify(
              { compose_code: item.compose_code, code: item.code },
            )}`,
          );
          continue;
        }

        const entityTypeCode = item.entity_type?.code;
        const key = buildIndexKey(composeCode, year, code, entityTypeCode);
        const existing = unitsByKey.get(key);

        const entity = existing ?? globalUnitRepo.create();
        const wasActive = entity.isActive ?? true;

        const prevKey = existing
          ? buildIndexKey(
              existing.composeCode,
              existing.year,
              existing.code,
              existing.entityTypeId,
            )
          : null;
        const prevCodeKey = existing
          ? this.normalizeIdentifier(existing.code) || null
          : null;

        entity.composeCode = composeCode;
        entity.code = code;
        entity.year = year;
        entity.name = this.normalizeNullableString(item.name);
        entity.shortName = this.normalizeNullableString(item.short_name);
        entity.acronym = this.normalizeNullableString(item.acronym);
        entity.startDate = this.normalizeDateString(item.start_date);
        entity.endDate = this.normalizeDateString(item.end_date);
        entity.level =
          typeof item.level === 'number' ? item.level : (entity.level ?? 0);

        entity.entityTypeId =
          typeof entityTypeCode === 'number' ? entityTypeCode : null;

        const portfolioCode = item.portfolio?.code;
        entity.portfolioId =
          typeof portfolioCode === 'number' ? portfolioCode : null;

        entity.isActive = this.normalizeBoolean(item.is_active, true);
        if (existing && !wasActive && entity.isActive) {
          reactivated++;
        }

        toUpsert.push(entity);

        if (prevKey && prevKey !== key) {
          unitsByKey.delete(prevKey);
        }
        if (prevCodeKey) {
          const lst = unitsByCode.get(prevCodeKey);
          if (lst) {
            const idx = lst.findIndex((x) => x.id === entity.id);
            if (idx >= 0) lst.splice(idx, 1);
            if (!lst.length) unitsByCode.delete(prevCodeKey);
          }
        }
      }

      const savedBatch = toUpsert.length
        ? await globalUnitRepo.save(toUpsert, { chunk: 1000 })
        : [];

      createdOrUpdated = savedBatch.length;

      for (const saved of savedBatch) {
        processedUnitIds.add(saved.id);
        const newKey = buildIndexKey(
          saved.composeCode,
          saved.year,
          saved.code,
          saved.entityTypeId,
        );
        unitsByKey.set(newKey, saved);
        registerInCodeIndex(saved);
      }

      const parentUpdates: ClarisaGlobalUnit[] = [];

      for (const item of sortedData) {
        const composeCode =
          this.normalizeOptionalString(item.compose_code) ??
          this.normalizeOptionalString(item.code);
        const code = this.normalizeOptionalString(item.code);
        const year = this.normalizeYear(item.year);
        if (!composeCode || !code) continue;

        const child = unitsByKey.get(
          buildIndexKey(
            composeCode,
            year,
            code,
            item.entity_type?.code ?? null,
          ),
        );
        if (!child) continue;

        if (!item.parent) {
          if (child.parentId) {
            child.parentId = null;
            parentUpdates.push(child);
          }
          continue;
        }

        const parent = this.resolveGlobalUnitReference(
          item.parent.compose_code,
          item.parent.code,
          item.parent.year,
          unitsByKey,
          unitsByCode,
        );

        if (!parent) {
          unresolvedParents++;
          this._logger.warn(
            `[${index}] Unable to resolve parent for child ${composeCode} (${year ?? 'null'}) using ref: ${JSON.stringify(item.parent)}`,
          );
          continue;
        }

        if (typeof year === 'number' && parent.year !== year) {
          this._logger.warn(
            `[${index}] Parent year mismatch for child ${composeCode}. Parent ${parent.composeCode} has year ${parent.year}, child expects ${year}`,
          );
        }

        const parentId = parent?.id ?? null;
        if ((child.parentId ?? null) !== parentId) {
          child.parentId = parentId;
          parentUpdates.push(child);
        }
      }

      if (parentUpdates.length) {
        const res = await globalUnitRepo.save(parentUpdates, { chunk: 1000 });
        parentLinksUpdated = res.length;
      }

      const unitsToDeactivate: ClarisaGlobalUnit[] = [];
      for (const unit of existingUnits) {
        if (!processedUnitIds.has(unit.id) && unit.isActive) {
          unit.isActive = false;
          unitsToDeactivate.push(unit);
        }
      }

      if (unitsToDeactivate.length) {
        const res = await globalUnitRepo.save(unitsToDeactivate, {
          chunk: 1000,
        });
        deactivated += res.length;
      }

      const lineageRecords: ClarisaGlobalUnitLineage[] = [];
      const lineageIndex = new Set<string>();

      for (const item of sortedData) {
        const composeCode =
          this.normalizeOptionalString(item.compose_code) ??
          this.normalizeOptionalString(item.code);
        const code = this.normalizeOptionalString(item.code);
        const year = this.normalizeYear(item.year);
        if (!composeCode || !code) continue;

        const toUnit = unitsByKey.get(
          buildIndexKey(
            composeCode,
            year,
            code,
            item.entity_type?.code ?? null,
          ),
        );
        if (!toUnit || !item.incoming_lineages?.length) continue;

        for (const lin of item.incoming_lineages) {
          const relationType = this.mapLineageRelationType(lin.relation_type);
          const fromRef = lin.from_global_unit_id ?? null;

          let fromUnitId: number | null = null;
          if (fromRef) {
            const ref = this.resolveGlobalUnitReference(
              fromRef.compose_code ?? fromRef.code,
              fromRef.code,
              fromRef.year,
              unitsByKey,
              unitsByCode,
            );
            if (ref) {
              fromUnitId = ref.id;
            } else {
              unresolvedFromRefs++;
              this._logger.warn(
                `[${index}] Unable to resolve from_global_unit for lineage ${lin.relation_type} on ${toUnit.composeCode}`,
              );
            }
          }

          const fromKey =
            fromUnitId !== null && fromUnitId !== undefined
              ? `ID:${fromUnitId}`
              : `CODE:${fromRef?.code ?? 'null'}|COMPOSE:${fromRef?.compose_code ?? 'null'}|YEAR:${fromRef?.year ?? 'null'}`;

          const lineageKey = `${fromKey}|TO:${toUnit.id}|TYPE:${relationType}`;
          if (lineageIndex.has(lineageKey)) continue;
          lineageIndex.add(lineageKey);

          const entity = lineageRepo.create({
            fromGlobalUnitId: fromUnitId,
            toGlobalUnitId: toUnit.id,
            relationType,
            note: this.normalizeNullableString(lin.note),
          });
          lineageRecords.push(entity);
        }
      }

      await lineageRepo.delete({});
      if (lineageRecords.length) {
        const res = await lineageRepo.save(lineageRecords, { chunk: 2000 });
        lineageInserted = res.length;
      }

      return savedBatch;
    });

    this._logger.log(
      `[${index}] Data successfully saved for ${endpoint.entity.name}! (upserted: ${createdOrUpdated}, reactivated: ${reactivated}, deactivated: ${deactivated}, parents linked: ${parentLinksUpdated}, lineage: ${lineageInserted}, skippedNoCode: ${skippedNoCode}, unresolvedParents: ${unresolvedParents}, unresolvedFromRefs: ${unresolvedFromRefs})`,
    );

    return savedUnits;
  }

  private async syncInitiatives(index: number) {
    const initiativesEndpoint = ClarisaEndpoints.INITIATIVES;
    this._logger.log(
      `>>>[${index}] Fetching data from CLARISA API for ${initiativesEndpoint.entity.name}`,
    );

    const data: CgiarEntityInitiativeDto[] = await this.clarisaConnection
      .get<CgiarEntityInitiativeDto[]>(initiativesEndpoint.path)
      .catch((err) => {
        this._logger.error(
          `[${index}] Error fetching data from CLARISA API for ${initiativesEndpoint.entity.name} path: ${initiativesEndpoint.path}`,
        );
        this._logger.error(err);
        return [];
      });

    const mappedInitiatives: DeepPartial<ClarisaInitiative>[] =
      this.cgiarEntityInitiativeMapper(data);

    for (const initiative of mappedInitiatives) {
      try {
        const found = await this._clarisaInitiativesRepository.findOne({
          where: { official_code: initiative.official_code },
        });

        if (found) {
          const updated = {
            ...found,
            ...initiative,
            toc_id: found.toc_id ?? initiative.toc_id,
            action_area_id: found.action_area_id ?? initiative.action_area_id,
          };
          await this._clarisaInitiativesRepository.save(updated);
        } else {
          const maxObj = await this._clarisaInitiativesRepository
            .createQueryBuilder('c')
            .select('MAX(c.id)', 'max')
            .getRawOne();
          const newId = (maxObj.max || 0) + 1;
          await this._clarisaInitiativesRepository.save({
            ...initiative,
            id: newId,
          });
        }
      } catch (error) {
        this._logger.error(
          `[${index}] Error processing initiative: ${initiative.official_code}`,
          error,
        );
      }
    }

    this._logger.log(
      `[${index}] Data saved for ${ClarisaEndpoints.INITIATIVES.entity.name}`,
    );
    return data;
  }

  private cgiarEntityInitiativeMapper(
    data: CgiarEntityInitiativeDto[],
  ): DeepPartial<ClarisaInitiative>[] {
    return data.map((item) => {
      const mapped: any = {
        official_code: item.code,
        name: item.name,
        short_name: item.short_name ?? item.name,
        action_area_id: null,
        active: true,
        toc_id: null,
        cgiar_entity_type_id: item.entity_type?.code ?? null,
        portfolio_id: item.portfolio?.code ?? null,
      };
      return mapped;
    });
  }

  private normalizeBoolean(
    value: boolean | number | string | null | undefined,
    defaultValue = true,
  ): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized.length) {
        return defaultValue;
      }
      if (['1', 'true', 't', 'yes', 'y'].includes(normalized)) {
        return true;
      }
      if (['0', 'false', 'f', 'no', 'n'].includes(normalized)) {
        return false;
      }
    }
    return defaultValue;
  }

  private normalizeIdentifier(value?: string | null): string {
    return value ? value.trim().toUpperCase() : '';
  }

  private normalizeOptionalString(value?: string | null): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private normalizeNullableString(value?: string | null): string | null {
    return this.normalizeOptionalString(value);
  }

  private normalizeDateString(value?: string | null): string | null {
    return this.normalizeOptionalString(value);
  }

  private normalizeYear(value?: number | null): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }

  private buildGlobalUnitKey(
    composeCode?: string | null,
    year?: number | null,
    code?: string | null,
  ): string {
    const base =
      this.normalizeIdentifier(composeCode) ||
      this.normalizeIdentifier(code) ||
      '__NO_CODE__';
    const normalizedYear =
      typeof year === 'number' && Number.isFinite(year) ? String(year) : 'null';
    return `${base}|${normalizedYear}`;
  }

  private resolveGlobalUnitReference(
    composeCode: string | null | undefined,
    code: string | null | undefined,
    year: number | null | undefined,
    unitsByKey: Map<string, ClarisaGlobalUnit>,
    unitsByCode: Map<string, ClarisaGlobalUnit[]>,
  ): ClarisaGlobalUnit | null {
    const normalizedCompose = this.normalizeOptionalString(composeCode);
    const normalizedCode = this.normalizeOptionalString(code);
    const normalizedYear = this.normalizeYear(year);

    const directKey = this.buildGlobalUnitKey(
      normalizedCompose ?? undefined,
      normalizedYear,
      normalizedCode ?? undefined,
    );
    const directMatch = unitsByKey.get(directKey);
    if (directMatch) {
      return directMatch;
    }

    if (normalizedCompose) {
      const fallbackKey = this.buildGlobalUnitKey(
        normalizedCompose,
        null,
        normalizedCode ?? undefined,
      );
      const fallbackMatch = unitsByKey.get(fallbackKey);
      if (fallbackMatch) {
        return fallbackMatch;
      }
    }

    if (normalizedCode) {
      const codeKey = this.normalizeIdentifier(normalizedCode) || '__NO_CODE__';
      const candidates = unitsByCode.get(codeKey) ?? [];
      if (typeof normalizedYear === 'number') {
        const yearMatch = candidates.find(
          (unit) => unit.year === normalizedYear,
        );
        if (yearMatch) {
          return yearMatch;
        }
      }
      const nullYearMatch = candidates.find((unit) => unit.year === null);
      if (nullYearMatch) {
        return nullYearMatch;
      }
      if (candidates.length) {
        return candidates[0];
      }
    }

    return null;
  }

  private mapLineageRelationType(
    value: string | null | undefined,
  ): ClarisaGlobalUnitLineageRelationType {
    switch ((value ?? '').toUpperCase()) {
      case ClarisaGlobalUnitLineageRelationType.MERGE:
        return ClarisaGlobalUnitLineageRelationType.MERGE;
      case ClarisaGlobalUnitLineageRelationType.SPLIT:
        return ClarisaGlobalUnitLineageRelationType.SPLIT;
      case ClarisaGlobalUnitLineageRelationType.SUCCESSOR:
        return ClarisaGlobalUnitLineageRelationType.SUCCESSOR;
      case ClarisaGlobalUnitLineageRelationType.NEW:
      default:
        return ClarisaGlobalUnitLineageRelationType.NEW;
    }
  }

  private async cloneResultTocRepository(index: number) {
    return Promise.resolve(
      this._logger.log(
        `>>>[${index}] Refreshing data from ToC Integration DB for ToC Results`,
      ),
    )
      .then(() => this._tocResultsRepository.inactiveTocResult())
      .then(() => this._tocResultsRepository.getAllTocResultsFromOst())
      .then((data) => this._tocResultsRepository.save(data))
      .then(() =>
        this._logger.debug(
          `[${index}] All ToC Results have been refreshed from ToC Integration DB!`,
        ),
      )
      .catch((err) => {
        this._logger.error(
          `[${index}] Error in manipulating the data of ToC Results`,
        );
        this._logger.error(err);
      });
  }
}
