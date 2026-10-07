// @akili-spec quality-assurance/qa-field-catalog
export interface CatalogYearVersion {
  portfolio: string;
  revision: number;
}

/** Catalogued phase years (DD-5, DD-9). `catalog_version` = `${year}.${revision}`. */
export const CATALOG_VERSIONS: Record<number, CatalogYearVersion> = {
  2026: { portfolio: 'P25', revision: 20 },
};
