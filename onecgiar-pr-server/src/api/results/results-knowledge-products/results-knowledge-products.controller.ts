import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  HttpException,
} from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { CreateResultsKnowledgeProductFromHandleDto } from './dto/create-results-knowledge-product-from-handle.dto';
import { UpdateResultsKnowledgeProductDto } from './dto/update-results-knowledge-product.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsKnowledgeProductDto } from './dto/results-knowledge-product.dto';
import { ResultsKnowledgeProductSaveDto } from './dto/results-knowledge-product-save.dto';

@Controller()
export class ResultsKnowledgeProductsController {
  constructor(
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
  ) {}

  @Post('create')
  async create(
    @Body() mqapMappedResponse: ResultsKnowledgeProductDto,
    @Headers() auth: HeadersDto,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );

    const { message, response, status } =
      await this._resultsKnowledgeProductsService.create(
        mqapMappedResponse,
        token,
      );

    throw new HttpException({ message, response }, status);
  }

  @Get('mqap')
  async getFromMQAPByHandle(@Query('handle') handle: string) {
    const { message, response, status } =
      await this._resultsKnowledgeProductsService.findOnCGSpace(handle);

    throw new HttpException({ message, response }, status);
  }

  @Get('find/by-handle')
  async findResultKnowledgeProductByHandle(@Query('handle') handle: string) {
    const { message, response, status } =
      await this._resultsKnowledgeProductsService.findResultKnowledgeProductByHandle(
        handle,
      );

    throw new HttpException({ message, response }, status);
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
  async update(@Param('resultId') id: number, @Headers() auth: HeadersDto) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );

    const { message, response, status } =
      await this._resultsKnowledgeProductsService.syncAgain(id, token);

    throw new HttpException({ message, response }, status);
  }

  @Patch('upsert/:resultId')
  remove(
    @Param('resultId') id: number,
    @Headers() auth: HeadersDto,
    @Body() sectionSevenData: ResultsKnowledgeProductSaveDto,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );

    return this._resultsKnowledgeProductsService.upsert(
      id,
      token,
      sectionSevenData,
    );
  }
}
