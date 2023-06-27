import { PartialType } from '@nestjs/mapped-types';
import { CreateVersioningDto } from './create-versioning.dto';

export class UpdateVersioningDto {
  public phase_name: string;
  public previous_phase: number;
  public status: boolean;
}
