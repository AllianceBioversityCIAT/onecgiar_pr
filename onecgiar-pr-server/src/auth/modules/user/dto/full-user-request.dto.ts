export class FullUserRequestDto {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  is_cgiar: boolean;
  active: boolean;
}
