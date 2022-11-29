import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';
import { CreateClarisaGeographicScopeDto } from './dto/create-clarisa-geographic-scope.dto';
import { UpdateClarisaGeographicScopeDto } from './dto/update-clarisa-geographic-scope.dto';

@Controller()
export class ClarisaGeographicScopesController {
  constructor(private readonly clarisaGeographicScopesService: ClarisaGeographicScopesService) {}

  @Post()
  create(@Body() createClarisaGeographicScopeDto: CreateClarisaGeographicScopeDto) {
    return this.clarisaGeographicScopesService.create(createClarisaGeographicScopeDto);
  }

  @Get('get/all/prms')
  async findAll() {
    const { message, response, status } =
      await  this.clarisaGeographicScopesService.findAllPRMS();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaGeographicScopesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaGeographicScopeDto: UpdateClarisaGeographicScopeDto) {
    return this.clarisaGeographicScopesService.update(+id, updateClarisaGeographicScopeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaGeographicScopesService.remove(+id);
  }
}
