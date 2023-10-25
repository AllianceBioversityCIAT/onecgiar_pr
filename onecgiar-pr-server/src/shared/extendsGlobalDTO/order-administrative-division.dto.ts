export class OrderAministrativeDivisionDto {
  public adminCode1: number;
  public lng: number;
  public geonameId: number;
  public toponymName: string;
  public countryId: number;
  public fcl: string;
  public population: number;
  public countryCode: string;
  public name: string;
  public fclName: string;
  public adminCodes1: AdminCodesDto;
  public countryName: string;
  public fcodeName: string;
  public adminName1: string;
  public lat: number;
  public fcode: string;
}

export class AdminCodesDto {
  public ISO3166_2: string;
}

export class geonameResponseDto {
  public totalResultsCount: number;
  public geonames: OrderAministrativeDivisionDto[];
}
