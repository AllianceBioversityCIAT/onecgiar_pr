import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsKnowledgeProductDto } from './dto/results-knowledge-product.dto';
import { ResultsKnowledgeProductSaveDto } from './dto/results-knowledge-product-save.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { FilterDto } from './dto/filter.dto';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsKnowledgeProductsController {
  constructor(
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
  ) {}

  @Post('create')
  create(
    @Body() mqapMappedResponse: ResultsKnowledgeProductDto,
    @UserToken() user: TokenDto,
  ) {
    return this._resultsKnowledgeProductsService.create(
      mqapMappedResponse,
      user,
    );
  }

  @Get('mqap')
  getFromMQAPByHandle(@Query('handle') handle: string) {
    return this._resultsKnowledgeProductsService.findOnCGSpace(handle, null);
  }

  @Get('find/by-handle')
  findResultKnowledgeProductByHandle(@Query('handle') handle: string) {
    return this._resultsKnowledgeProductsService.findResultKnowledgeProductByHandle(
      handle,
    );
  }

  @Get('get/:id')
  getKnowledgeProductById(@Param('id') id: number) {
    return this._resultsKnowledgeProductsService.findOneByKnowledgeProductId(
      id,
    );
  }

  @Get('get/result/:id')
  getKnowledgeProductByResultId(@Param('id') id: number) {
    return this._resultsKnowledgeProductsService.findOneByResultId(id);
  }

  @Patch('resync/:resultId')
  update(@Param('resultId') id: number, @UserToken() user: TokenDto) {
    return this._resultsKnowledgeProductsService.syncAgain(id, user);
  }

  @Patch('upsert/:resultId')
  remove(
    @Param('resultId') id: number,
    @UserToken() user: TokenDto,
    @Body() sectionSevenData: ResultsKnowledgeProductSaveDto,
  ) {
    return this._resultsKnowledgeProductsService.upsert(
      id,
      user,
      sectionSevenData,
    );
  }

  @Post('get/excel-report')
  async getMQAPMatchesList(@Body() filterDto: FilterDto) {
    return this._resultsKnowledgeProductsService.getMQAPMatchesList(filterDto);
  }
}
