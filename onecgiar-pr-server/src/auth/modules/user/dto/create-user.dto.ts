export class CreateUserDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  created_by: number;
  last_updated_by: number;
  is_cgiar!: boolean;
}
