import { TokenDto } from '../../../globalInterfaces/token.dto';

export interface BuildEmailDataDto {
  initContributing: {
    id: number;
    name: string;
    official_code: string;
  };
  user?: TokenDto;
  initOwner: {
    id: number;
    name: string;
    official_code: string;
  };
  result: {
    result_code: number;
    title: string;
    version_id: number;
  };
  pcuEmail?: string;
}
