export interface BuildEmailDataDto {
  initContributing: {
    id: number;
    name: string;
    official_code: string;
  };
  user?: {
    first_name: string;
    last_name: string;
  };
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
}
