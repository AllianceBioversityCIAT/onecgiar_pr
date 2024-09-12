import { TokenDto } from '../../globalInterfaces/token.dto';

export interface BuildEmailDataDto {
  initContributing: {
    id: number;
    name: string;
    official_code: string;
    short_name: string;
  };
  user?: TokenDto;
  initOwner: {
    id: number;
    name: string;
    official_code: string;
    short_name: string;
  };
  result: {
    result_code: number;
    title: string;
    version_id: number;
  };
  pcuEmail?: string;
}
