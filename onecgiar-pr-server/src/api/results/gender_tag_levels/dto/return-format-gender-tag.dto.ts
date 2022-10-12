import { GenderTagLevel } from '../entities/gender_tag_level.entity';
import { returnFormatService } from '../../../../shared/extendsGlobalDTO/returnServices.dto';

export class returnFormatGenderTag extends returnFormatService {
  public response!: GenderTagLevel[] | {};
}
