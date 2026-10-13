// @akili-spec quality-assurance/qa-field-catalog
import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogDefinition } from './definitions/types';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { isValidIn } from './definitions/validity';
import { CATALOG_VERSIONS, CatalogYearVersion } from './definitions/versions';
import { QaCatalogResponse } from './dto/qa-catalog-response.dto';
import {
  toFieldResponse,
  toResultTypeResponse,
  toSectionResponse,
} from './qa-catalog.mapper';

/** Everything `getCatalog` reads; injectable so tests can pass fixture catalogs (DD-1, DD-5). */
export interface QaCatalogSource extends Omit<CatalogDefinition, 'notForQa'> {
  versions: Record<number, CatalogYearVersion>;
}

const CODE_CATALOG: QaCatalogSource = {
  resultTypes: CATALOG_RESULT_TYPES,
  sections: CATALOG_SECTIONS,
  fields: CATALOG_FIELDS,
  versions: CATALOG_VERSIONS,
};

const noCatalogMessage = (year: number) =>
  `No QA catalog available for phase_year ${year}`;

@Injectable()
export class QaCatalogService {
  /**
   * QAC-R-3 / R-9 / R-12: pure projection of the code catalog for one phase year, no DB read.
   * A year not declared in `versions`, or whose projected response has no fields, is a 404, never an
   * empty catalog.
   */
  getCatalog(
    year: number,
    source: QaCatalogSource = CODE_CATALOG,
  ): QaCatalogResponse {
    const version = Object.prototype.hasOwnProperty.call(source.versions, year)
      ? source.versions[year]
      : undefined;
    if (!version) {
      throw new NotFoundException(noCatalogMessage(year));
    }
    const validFields = source.fields.filter((f) => isValidIn(f, year));

    const sectionsWithFields = new Set(validFields.map((f) => f.section));
    const sections = source.sections
      .filter((s) => isValidIn(s, year) && sectionsWithFields.has(s.key))
      .sort((a, b) => a.order - b.order);
    const sectionOrder = new Map(sections.map((s) => [s.key, s.order]));

    const fields = validFields
      .filter((f) => sectionOrder.has(f.section))
      .sort(
        (a, b) =>
          sectionOrder.get(a.section) - sectionOrder.get(b.section) ||
          a.order - b.order ||
          a.key.localeCompare(b.key),
      );

    // R-9: emptiness is judged on the FINAL projection (a retired section can drop every valid field)
    if (fields.length === 0) {
      throw new NotFoundException(noCatalogMessage(year));
    }

    const coversAll = fields.some((f) => f.result_types.includes('*'));
    const coveredTypes = new Set(fields.flatMap((f) => f.result_types));
    const resultTypes = source.resultTypes.filter(
      (t) => coversAll || coveredTypes.has(t.key),
    );

    return {
      portfolio: version.portfolio,
      phase: year,
      catalog_version: `${year}.${version.revision}`,
      generated_at: new Date().toISOString(),
      result_types: resultTypes.map(toResultTypeResponse),
      sections: sections.map(toSectionResponse),
      fields: fields.map(toFieldResponse),
    };
  }
}
