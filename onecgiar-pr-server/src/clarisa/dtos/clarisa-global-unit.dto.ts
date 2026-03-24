export interface ClarisaGlobalUnitDto {
  code: string;
  name: string;
  compose_code: string;
  year: number | null;
  short_name: string | null;
  acronym: string | null;
  start_date: string | null;
  end_date: string | null;
  level: number;
  entity_type?: ClarisaGlobalUnitEntityTypeDto | null;
  parent?: ClarisaGlobalUnitParentDto | null;
  portfolio?: ClarisaGlobalUnitPortfolioDto | null;
  incoming_lineages?: ClarisaGlobalUnitIncomingLineageDto[] | null;
  is_active?: boolean | number | null;
}

export interface ClarisaGlobalUnitEntityTypeDto {
  code: number | null;
  name?: string | null;
}

export interface ClarisaGlobalUnitParentDto {
  code: string | null;
  name?: string | null;
  compose_code?: string | null;
  year?: number | null;
}

export interface ClarisaGlobalUnitPortfolioDto {
  code: number | null;
  name?: string | null;
}

export interface ClarisaGlobalUnitIncomingLineageDto {
  relation_type: 'MERGE' | 'SPLIT' | 'SUCCESSOR' | 'NEW';
  note: string | null;
  from_global_unit_id: ClarisaGlobalUnitLineageUnitReference;
}

export interface ClarisaGlobalUnitLineageUnitReference {
  code: string;
  name: string | null;
  compose_code: string;
  year: number | null;
}
