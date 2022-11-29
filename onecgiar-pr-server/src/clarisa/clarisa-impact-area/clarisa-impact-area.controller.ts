import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaImpactAreaService } from './clarisa-impact-area.service';
import { CreateClarisaImpactAreaDto } from './dto/create-clarisa-impact-area.dto';
import { UpdateClarisaImpactAreaDto } from './dto/update-clarisa-impact-area.dto';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaImpactAreaController {
  constructor(
    private readonly clarisaImpactAreaService: ClarisaImpactAreaService,
  ) {}

  @Post()
  create(@Body() createClarisaImpactAreaDto: CreateClarisaImpactAreaDto) {
    return this.clarisaImpactAreaService.create(createClarisaImpactAreaDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaImpactAreaService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaImpactAreaService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClarisaImpactAreaDto: UpdateClarisaImpactAreaDto,
  ) {
    return this.clarisaImpactAreaService.update(
      +id,
      updateClarisaImpactAreaDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaImpactAreaService.remove(+id);
  }
}
