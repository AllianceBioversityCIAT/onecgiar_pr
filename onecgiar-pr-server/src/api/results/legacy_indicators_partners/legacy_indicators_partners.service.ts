import { Injectable } from '@nestjs/common';
import { CreateLegacyIndicatorsPartnerDto } from './dto/create-legacy_indicators_partner.dto';
import { UpdateLegacyIndicatorsPartnerDto } from './dto/update-legacy_indicators_partner.dto';

@Injectable()
export class LegacyIndicatorsPartnersService {
  create(createLegacyIndicatorsPartnerDto: CreateLegacyIndicatorsPartnerDto) {
    return 'This action adds a new legacyIndicatorsPartner';
  }

  findAll() {
    return `This action returns all legacyIndicatorsPartners`;
  }

  findOne(id: number) {
    return `This action returns a #${id} legacyIndicatorsPartner`;
  }

  update(
    id: number,
    updateLegacyIndicatorsPartnerDto: UpdateLegacyIndicatorsPartnerDto,
  ) {
    return `This action updates a #${id} legacyIndicatorsPartner`;
  }

  remove(id: number) {
    return `This action removes a #${id} legacyIndicatorsPartner`;
  }
}
