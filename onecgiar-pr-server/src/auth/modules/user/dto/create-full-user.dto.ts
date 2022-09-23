import { CreateUserDto } from './create-user.dto';
import { CreateComplementaryDataUserDto } from '../../complementary-data-user/dto/create-complementary-data-user.dto';
export class CreateFullUserDto {
  userData: CreateUserDto;
  complementData: CreateComplementaryDataUserDto;
  role: number;
}
