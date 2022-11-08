import { CreateUserDto } from './create-user.dto';
export class CreateFullUserDto {
  userData: CreateUserDto;
  role: number;
}
