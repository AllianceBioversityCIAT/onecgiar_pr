import { Injectable, Logger } from '@nestjs/common';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';
import { ContributorsPartnersService } from '../../results-framework-reporting/contributors-partners/contributors-partners.service';

@Injectable()
export class IpsrContributorsPartnersService {
  private readonly logger = new Logger(IpsrContributorsPartnersService.name);

  constructor(
    private readonly _contributorsPartnersService: ContributorsPartnersService,
  ) {}

  async getContributorsPartnersByResultId(resultId: number) {
    return this._contributorsPartnersService.getContributorsPartnersByResultId(
      resultId,
    );
  }

  async updateContributorsAndPartners(
    resultId: number,
    payload: UpdateContributorsPartnersDto,
    user: TokenDto,
  ) {
    return this._contributorsPartnersService.updateContributorsAndPartners(
      resultId,
      payload,
      user,
    );
  }
}
