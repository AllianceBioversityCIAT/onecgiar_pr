import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { ClarisaRegionsService } from './clarisa-regions.service';
import { CreateClarisaRegionDto } from './dto/create-clarisa-region.dto';
import { UpdateClarisaRegionDto } from './dto/update-clarisa-region.dto';

@Controller()
export class ClarisaRegionsController {
  constructor(private readonly clarisaRegionsService: ClarisaRegionsService) {}

  @Post()
  create(@Body() createClarisaRegionDto: CreateClarisaRegionDto) {
    return this.clarisaRegionsService.create(createClarisaRegionDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaRegionsService.findAllNoParent();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaRegionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClarisaRegionDto: UpdateClarisaRegionDto,
  ) {
    return this.clarisaRegionsService.update(+id, updateClarisaRegionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaRegionsService.remove(+id);
  }
}
