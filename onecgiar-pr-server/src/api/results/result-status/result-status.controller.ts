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
import { ResultStatusService } from './result-status.service';
import { CreateResultStatusDto } from './dto/create-result-status.dto';
import { UpdateResultStatusDto } from './dto/update-result-status.dto';

@Controller()
export class ResultStatusController {
  constructor(private readonly resultStatusService: ResultStatusService) {}

  @Post()
  create(@Body() createResultStatusDto: CreateResultStatusDto) {
    return this.resultStatusService.create(createResultStatusDto);
  }

  @Get('all')
  async findAll() {
    const { response, message, status } =
      await this.resultStatusService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultStatusService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultStatusDto: UpdateResultStatusDto,
  ) {
    return this.resultStatusService.update(+id, updateResultStatusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultStatusService.remove(+id);
  }
}
