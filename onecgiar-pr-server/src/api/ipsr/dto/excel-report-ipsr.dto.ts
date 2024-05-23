export class ExcelReportDto {
  inits: Initiatives[];
  phases: Phases[];
  searchText: string;
}

export interface Initiatives {
  id: number;
}

export interface Phases {
  id: number;
}
