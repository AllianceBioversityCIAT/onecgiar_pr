import { returnFormatService } from '../../../../shared/extendsGlobalDTO/returnServices.dto';
import { GenderTagLevel } from '../entities/gender_tag_level.entity';

export class returnFormatGenderTag extends returnFormatService {
  public response!: GenderTagLevel | GenderTagLevel[];
}
