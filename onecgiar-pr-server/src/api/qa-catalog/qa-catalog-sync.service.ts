// @akili-spec quality-assurance/qa-field-catalog
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QaCatalogField } from './entities/qa-catalog-field.entity';
import { QaCatalogResultType } from './entities/qa-catalog-result-type.entity';
import { QaCatalogSection } from './entities/qa-catalog-section.entity';
import { QaCatalogVersion } from './entities/qa-catalog-version.entity';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_VERSIONS } from './definitions/versions';
import {
  computeCatalogContentHash,
  stableStringify,
} from './definitions/content-hash';
import { CatalogField, CatalogSubField } from './definitions/types';
import { QaCatalogSource } from './qa-catalog.service';

export interface QaCatalogSyncResult {
  inserted: number;
  updated: number;
  orphans: string[];
}

const CODE_CATALOG: QaCatalogSource = {
  resultTypes: CATALOG_RESULT_TYPES,
  sections: CATALOG_SECTIONS,
  fields: CATALOG_FIELDS,
  versions: CATALOG_VERSIONS,
};

type Row = Record<string, unknown>;

const JSON_COLUMNS = new Set(['result_types', 'required_when', 'storage']);
const BOOLEAN_COLUMNS = new Set(['required', 'required_confirmed']);

/** Comparable form of a column value: order-insensitive JSON, 0/1 as boolean, undefined as null. */
function normalize(column: string, value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (JSON_COLUMNS.has(column)) return stableStringify(value);
  if (BOOLEAN_COLUMNS.has(column)) return Boolean(value);
  return value;
}

/** Field-by-field diff: only the columns whose value differs, in the code's representation. */
function diff(existing: Row, desired: Row, columns: string[]): Row {
  const patch: Row = {};
  for (const column of columns) {
    if (
      normalize(column, existing[column]) !== normalize(column, desired[column])
    ) {
      patch[column] = desired[column] === undefined ? null : desired[column];
    }
  }
  return patch;
}

const FIELD_COLUMNS = [
  'label',
  'description',
  'type',
  'control_list',
  'section_key',
  'order',
  'result_types',
  'required',
  'required_confirmed',
  'required_when',
  'valid_from',
  'valid_to',
  'storage',
];
const SECTION_COLUMNS = [
  'label',
  'order',
  'result_types',
  'valid_from',
  'valid_to',
];
const RESULT_TYPE_COLUMNS = ['label', 'level'];

/**
 * DD-4 / DD-10 / DD-13: a field is one row (parent_key ''), each subfield one more row. A depth-1
 * subfield carries its field's key as parent_key; a depth-2 subfield carries '<field>.<sub>' (the
 * dotted path of its parent row). `visible_when` has no column on qa_catalog_field yet (it needs a
 * migration), so it is not persisted; the endpoint serves it from code.
 */
function toFieldRows(field: CatalogField): Row[] {
  const base = {
    section_key: field.section,
    valid_from: field.valid_from,
    valid_to: field.valid_to,
  };
  const rows: Row[] = [
    {
      key: field.key,
      parent_key: '',
      label: field.label,
      description: field.description ?? null,
      type: field.type,
      control_list: field.control_list ?? null,
      order: field.order,
      result_types: field.result_types,
      required: field.required,
      required_confirmed: field.required_confirmed,
      required_when: field.required_when ?? null,
      storage: field.storage,
      ...base,
    },
  ];
  const addSubfields = (
    subs: CatalogSubField[] | undefined,
    parentKey: string,
  ) => {
    (subs ?? []).forEach((sub, index) => {
      rows.push({
        key: sub.key,
        parent_key: parentKey,
        label: sub.label,
        description: null,
        type: sub.type,
        control_list: sub.control_list ?? null,
        order: index,
        result_types: field.result_types,
        required: sub.required ?? false,
        required_confirmed: false,
        required_when: sub.required_when ?? null,
        storage: sub.storage,
        ...base,
      });
      addSubfields(sub.subfields, `${parentKey}.${sub.key}`);
    });
  };
  addSubfields(field.subfields, field.key);
  return rows;
}

/**
 * QAC-R-6: on boot, mirror the code catalog into the qa_catalog_* tables. Inserts missing rows,
 * updates changed columns by key, NEVER deletes (rows absent from code are warned about, and
 * retired entries keep their row, QAC-R-3). A failure is logged (counts only) and never thrown,
 * so the app keeps serving (the endpoint reads code, DD-1).
 */
@Injectable()
export class QaCatalogSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QaCatalogSyncService.name);

  constructor(
    @InjectRepository(QaCatalogResultType)
    private readonly resultTypeRepo: Repository<QaCatalogResultType>,
    @InjectRepository(QaCatalogSection)
    private readonly sectionRepo: Repository<QaCatalogSection>,
    @InjectRepository(QaCatalogField)
    private readonly fieldRepo: Repository<QaCatalogField>,
    @InjectRepository(QaCatalogVersion)
    private readonly versionRepo: Repository<QaCatalogVersion>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sync();
  }

  async sync(
    source: QaCatalogSource = CODE_CATALOG,
  ): Promise<QaCatalogSyncResult> {
    const result: QaCatalogSyncResult = {
      inserted: 0,
      updated: 0,
      orphans: [],
    };
    try {
      await this.syncResultTypes(source, result);
      await this.syncSections(source, result);
      await this.syncFields(source, result);
      await this.syncVersions(source, result);
      for (const orphan of result.orphans) {
        this.logger.warn(
          `qa-catalog sync: row present in table but not in code (kept): ${orphan}`,
        );
      }
      this.logger.log(
        `qa-catalog sync: inserted=${result.inserted} updated=${result.updated} orphans=[${result.orphans.join(',')}]`,
      );
    } catch (error) {
      // Counts and error class only: driver messages can embed SQL values or credentials.
      const name = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error(
        `qa-catalog sync failed (${name}): inserted=${result.inserted} updated=${result.updated}`,
      );
    }
    return result;
  }

  private async syncResultTypes(
    source: QaCatalogSource,
    result: QaCatalogSyncResult,
  ) {
    const existing = new Map<string, Row>(
      (await this.resultTypeRepo.find()).map((r) => [
        r.key,
        r as unknown as Row,
      ]),
    );
    const desired = source.resultTypes.map((t) => ({ ...t }) as Row);
    const inserts: Row[] = [];
    for (const row of desired) {
      const current = existing.get(row.key as string);
      if (!current) {
        inserts.push(row);
        continue;
      }
      const patch = diff(current, row, RESULT_TYPE_COLUMNS);
      if (Object.keys(patch).length) {
        await this.resultTypeRepo.update(
          { key: row.key as string },
          patch as any,
        );
        result.updated++;
      }
    }
    if (inserts.length) {
      await this.resultTypeRepo.insert(inserts as any);
      result.inserted += inserts.length;
    }
    this.collectOrphans(
      'result_type',
      existing.keys(),
      desired.map((r) => r.key as string),
      result,
    );
  }

  private async syncSections(
    source: QaCatalogSource,
    result: QaCatalogSyncResult,
  ) {
    const existing = new Map<string, Row>(
      (await this.sectionRepo.find()).map((r) => [r.key, r as unknown as Row]),
    );
    const desired = source.sections.map((s) => ({ ...s }) as Row);
    const inserts: Row[] = [];
    for (const row of desired) {
      const current = existing.get(row.key as string);
      if (!current) {
        inserts.push(row);
        continue;
      }
      const patch = diff(current, row, SECTION_COLUMNS);
      if (Object.keys(patch).length) {
        await this.sectionRepo.update({ key: row.key as string }, patch as any);
        result.updated++;
      }
    }
    if (inserts.length) {
      await this.sectionRepo.insert(inserts as any);
      result.inserted += inserts.length;
    }
    this.collectOrphans(
      'section',
      existing.keys(),
      desired.map((r) => r.key as string),
      result,
    );
  }

  private async syncFields(
    source: QaCatalogSource,
    result: QaCatalogSyncResult,
  ) {
    const idOf = (key: string, parent: string) =>
      parent ? `${parent}.${key}` : key;
    const existing = new Map<string, Row>(
      (await this.fieldRepo.find()).map((r) => [
        idOf(r.key, r.parent_key),
        r as unknown as Row,
      ]),
    );
    const desired = source.fields.flatMap(toFieldRows);
    const inserts: Row[] = [];
    for (const row of desired) {
      const current = existing.get(
        idOf(row.key as string, row.parent_key as string),
      );
      if (!current) {
        inserts.push(row);
        continue;
      }
      const patch = diff(current, row, FIELD_COLUMNS);
      if (Object.keys(patch).length) {
        await this.fieldRepo.update(
          { key: row.key as string, parent_key: row.parent_key as string },
          patch as any,
        );
        result.updated++;
      }
    }
    if (inserts.length) {
      await this.fieldRepo.insert(inserts as any);
      result.inserted += inserts.length;
    }
    this.collectOrphans(
      'field',
      existing.keys(),
      desired.map((r) => idOf(r.key as string, r.parent_key as string)),
      result,
    );
  }

  private async syncVersions(
    source: QaCatalogSource,
    result: QaCatalogSyncResult,
  ) {
    const existing = new Map<number, QaCatalogVersion>(
      (await this.versionRepo.find()).map((r) => [Number(r.phase_year), r]),
    );
    const years = Object.keys(source.versions).map(Number);
    for (const year of years) {
      const declared = source.versions[year];
      const desired = {
        portfolio: declared.portfolio,
        revision: declared.revision,
        content_hash: computeCatalogContentHash(source, year),
      };
      const current = existing.get(year);
      // synced_at is stamped by SQL (UTC) instead of a JS Date (driver serialises local time).
      const stamp = () => 'CURRENT_TIMESTAMP';
      if (!current) {
        await this.versionRepo.insert({
          phase_year: year,
          ...desired,
          synced_at: stamp,
        } as any);
        result.inserted++;
        continue;
      }
      const patch = diff(current as unknown as Row, desired, [
        'portfolio',
        'revision',
        'content_hash',
      ]);
      if (Object.keys(patch).length) {
        await this.versionRepo.update({ phase_year: year }, {
          ...patch,
          synced_at: stamp,
        } as any);
        result.updated++;
      }
    }
    this.collectOrphans(
      'version',
      Array.from(existing.keys()).map(String),
      years.map(String),
      result,
    );
  }

  private collectOrphans(
    kind: string,
    existingKeys: Iterable<string>,
    codeKeys: string[],
    result: QaCatalogSyncResult,
  ) {
    const inCode = new Set(codeKeys);
    for (const key of existingKeys) {
      if (!inCode.has(key)) result.orphans.push(`${kind}:${key}`);
    }
  }
}
