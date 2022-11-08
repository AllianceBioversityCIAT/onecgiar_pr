import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ClarisaCentersService } from './clarisa-centers.service';
import { CreateClarisaCenterDto } from './dto/create-clarisa-center.dto';
import { UpdateClarisaCenterDto } from './dto/update-clarisa-center.dto';

@Controller()
export class ClarisaCentersController {
  constructor(private readonly clarisaCentersService: ClarisaCentersService) {}

  @Post()
  create(@Body() createClarisaCenterDto: CreateClarisaCenterDto) {
    return this.clarisaCentersService.create(createClarisaCenterDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
    await this.clarisaCentersService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaCentersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaCenterDto: UpdateClarisaCenterDto) {
    return this.clarisaCentersService.update(+id, updateClarisaCenterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaCentersService.remove(+id);
  }
}
