// @akili-spec quality-assurance/qa-field-catalog
// DD-3 / DD-8: entity classes whose every column must be catalogued (bound to a field or listed in
// NOT_FOR_QA). Starts empty; each per-type task (QAC-T-8..11) adds its tables together with its fields.
export type EntityClass = new (...args: any[]) => object;

export const CATALOG_SCOPE: EntityClass[] = [];
