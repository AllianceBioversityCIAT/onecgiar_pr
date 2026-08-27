export class CgspacePageMetaDto {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export class CgspaceItemDto {
  uuid: string;
  handle: string;
  handleUrl: string;
  itemUrl: string;
  title: string;
  type: string;
  year: number | null;
  authors: string[];
  affiliations: string[];
  countries: string[];
  doi: string | null;
  uri: string;
}

export class CgspaceSearchPageDto {
  items: CgspaceItemDto[];
  page: CgspacePageMetaDto;
}
