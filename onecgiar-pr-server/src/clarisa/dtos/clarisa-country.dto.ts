import { ClarisaUnRegionDto } from './clarisa-un-region.dto';

export class ClarisaCountryDto {
  code: number;
  isoAlpha2: string;
  isoAlpha3: string;
  name: string;
  regionDTO: ClarisaUnRegionDto;
  locationDTO: ClarisaLocationDto;
}

class ClarisaLocationDto {
  latitude: number;
  longitude: number;
}
