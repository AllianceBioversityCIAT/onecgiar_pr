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
import { ResultActorsService } from './result-actors.service';
import { CreateResultActorDto } from './dto/create-result-actor.dto';
import { UpdateResultActorDto } from './dto/update-result-actor.dto';

@Controller()
export class ResultActorsController {
  constructor(private readonly resultActorsService: ResultActorsService) {}

  @Post()
  create(@Body() createResultActorDto: CreateResultActorDto) {
    return this.resultActorsService.create(createResultActorDto);
  }

  @Get('type/all')
  async findAll() {
    const { message, response, status } =
      await this.resultActorsService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultActorsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultActorDto: UpdateResultActorDto,
  ) {
    return this.resultActorsService.update(+id, updateResultActorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultActorsService.remove(+id);
  }
}
