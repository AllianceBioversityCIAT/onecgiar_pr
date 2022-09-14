import { User } from '../../user/entities/user.entity';
export class CreateComplementaryDataUserDto {
  user_id!: number;
  is_cgiar!: boolean;
  password?: string | null;
  last_login?: Date | null;
  active!: boolean;
}
