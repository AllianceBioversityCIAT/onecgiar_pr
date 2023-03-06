import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { CreateIpsrDto } from './dto/create-ipsr.dto';
import { UpdateIpsrDto } from './dto/update-ipsr.dto';

@Controller('ipsr')
export class IpsrController {
  constructor(private readonly ipsrService: IpsrService) {}

  @Post()
  create(@Body() createIpsrDto: CreateIpsrDto) {
    return this.ipsrService.create(createIpsrDto);
  }

  @Get()
  findAll() {
    return this.ipsrService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ipsrService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIpsrDto: UpdateIpsrDto) {
    return this.ipsrService.update(+id, updateIpsrDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ipsrService.remove(+id);
  }
}
