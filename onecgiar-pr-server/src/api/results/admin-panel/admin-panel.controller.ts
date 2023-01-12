import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { AdminPanelService } from './admin-panel.service';
import { CreateAdminPanelDto } from './dto/create-admin-panel.dto';
import { UpdateAdminPanelDto } from './dto/update-admin-panel.dto';

@Controller()
export class AdminPanelController {
  constructor(private readonly adminPanelService: AdminPanelService) {}

  @Post()
  create(@Body() createAdminPanelDto: CreateAdminPanelDto) {
    return this.adminPanelService.create(createAdminPanelDto);
  }

  @Get('report/results/completeness')
  async reportResultCompleteness() {
    const {message, response, status} = 
      await this.adminPanelService.reportResultCompleteness();
    throw new HttpException({ message, response }, status);
  }

  @Get('report/user')
  findOne(@Param('id') id: string) {
    return this.adminPanelService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminPanelDto: UpdateAdminPanelDto) {
    return this.adminPanelService.update(+id, updateAdminPanelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminPanelService.remove(+id);
  }
}
