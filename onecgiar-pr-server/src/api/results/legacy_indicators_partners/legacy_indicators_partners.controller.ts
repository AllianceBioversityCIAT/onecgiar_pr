import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LegacyIndicatorsPartnersService } from './legacy_indicators_partners.service';
import { CreateLegacyIndicatorsPartnerDto } from './dto/create-legacy_indicators_partner.dto';
import { UpdateLegacyIndicatorsPartnerDto } from './dto/update-legacy_indicators_partner.dto';

@Controller('legacy-indicators-partners')
export class LegacyIndicatorsPartnersController {
  constructor(private readonly legacyIndicatorsPartnersService: LegacyIndicatorsPartnersService) {}

  @Post()
  create(@Body() createLegacyIndicatorsPartnerDto: CreateLegacyIndicatorsPartnerDto) {
    return this.legacyIndicatorsPartnersService.create(createLegacyIndicatorsPartnerDto);
  }

  @Get()
  findAll() {
    return this.legacyIndicatorsPartnersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.legacyIndicatorsPartnersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLegacyIndicatorsPartnerDto: UpdateLegacyIndicatorsPartnerDto) {
    return this.legacyIndicatorsPartnersService.update(+id, updateLegacyIndicatorsPartnerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.legacyIndicatorsPartnersService.remove(+id);
  }
}
