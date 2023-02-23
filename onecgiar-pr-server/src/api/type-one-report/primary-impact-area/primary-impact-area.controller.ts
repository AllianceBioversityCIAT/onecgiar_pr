import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PrimaryImpactAreaService } from './primary-impact-area.service';
import { CreatePrimaryImpactAreaDto } from './dto/create-primary-impact-area.dto';
import { UpdatePrimaryImpactAreaDto } from './dto/update-primary-impact-area.dto';

@Controller('primary-impact-area')
export class PrimaryImpactAreaController {
  
  constructor(private readonly primaryImpactAreaService: PrimaryImpactAreaService) {}

  @Post('create')
  async create(@Body() createPrimaryImpactAreaDto: CreatePrimaryImpactAreaDto) {
    if(createPrimaryImpactAreaDto.result_id != null && 
      createPrimaryImpactAreaDto.impact_area_id != null &&
      createPrimaryImpactAreaDto.updated_by != null &&
      createPrimaryImpactAreaDto.create_by != null){
        return await this.primaryImpactAreaService.create(createPrimaryImpactAreaDto);
    }
    return {
      response:'Input in null',
      status: 500
    };
  }

  
}
