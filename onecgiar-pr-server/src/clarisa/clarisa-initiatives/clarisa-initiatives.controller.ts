import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { CreateClarisaInitiativeDto } from './dto/create-clarisa-initiative.dto';
import { UpdateClarisaInitiativeDto } from './dto/update-clarisa-initiative.dto';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaInitiativesController {
  constructor(
    private readonly clarisaInitiativesService: ClarisaInitiativesService,
  ) {}

  @Post()
  create(@Body() createClarisaInitiativeDto: CreateClarisaInitiativeDto) {
    return this.clarisaInitiativesService.create(createClarisaInitiativeDto);
  }

  @Get('get/all/without/result/:resultId')
  async getAllInitiativesWithoutCurrentInitiative(
    @Param('resultId') resultId: number,
  ) {
    const { message, response, status } =
      await this.clarisaInitiativesService.getAllInitiativesWithoutCurrentInitiative(
        resultId,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get()
  findAll() {
    return this.clarisaInitiativesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInitiativesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClarisaInitiativeDto: UpdateClarisaInitiativeDto,
  ) {
    return this.clarisaInitiativesService.update(
      +id,
      updateClarisaInitiativeDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaInitiativesService.remove(+id);
  }
}
