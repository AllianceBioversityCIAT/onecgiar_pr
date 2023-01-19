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

  @Get('report/results/:resultId/submissions')
  async submissionsByResults(
    @Param('resultId') resultId: number
  ) {
    const {message, response, status} = 
      await this.adminPanelService.submissionsByResults(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('report/users')
  async userReport() {
    const {message, response, status} = 
      await this.adminPanelService.userReport();
    throw new HttpException({ message, response }, status);
  }
}
