import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';
import { CreateClarisaGlobalTargetDto } from './dto/create-clarisa-global-target.dto';
import { UpdateClarisaGlobalTargetDto } from './dto/update-clarisa-global-target.dto';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaGlobalTargetController {
  constructor(
    private readonly clarisaGlobalTargetService: ClarisaGlobalTargetService,
  ) {}

  @Post()
  create(@Body() createClarisaGlobalTargetDto: CreateClarisaGlobalTargetDto) {
    return this.clarisaGlobalTargetService.create(createClarisaGlobalTargetDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaGlobalTargetService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaGlobalTargetService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClarisaGlobalTargetDto: UpdateClarisaGlobalTargetDto,
  ) {
    return this.clarisaGlobalTargetService.update(
      +id,
      updateClarisaGlobalTargetDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaGlobalTargetService.remove(+id);
  }
}
