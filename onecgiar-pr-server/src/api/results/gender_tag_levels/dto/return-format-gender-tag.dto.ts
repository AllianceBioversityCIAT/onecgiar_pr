import { GenderTagLevel } from '../entities/gender_tag_level.entity';
import { retunFormatService } from '../../../../shared/extendsGlobalDTO/retunServices.dto';

export class retunrFormatGenderTag extends retunFormatService {
  public response!: GenderTagLevel[] | {};
}
