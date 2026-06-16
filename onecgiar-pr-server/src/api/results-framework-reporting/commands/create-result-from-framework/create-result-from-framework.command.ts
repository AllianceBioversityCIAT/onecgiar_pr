import { CreateResultsFrameworkResultDto } from '../../dto/create-results-framework.dto';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';

export class CreateResultFromFrameworkCommand {
  constructor(
    public readonly payload: CreateResultsFrameworkResultDto,
    public readonly user: TokenDto,
  ) {}
}
