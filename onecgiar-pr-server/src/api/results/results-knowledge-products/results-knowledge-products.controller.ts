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

@Controller()
export class ResultsKnowledgeProductsController {
  constructor(
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
  ) {}

  @Post('create/from-handle')
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

  @Get('find/by-handle')
  async findResultKnowledgeProductByHandle(@Param('handle') handle: string) {
    const { message, response, status } =
      await this._resultsKnowledgeProductsService.findResultKnowledgeProductByHandle(
        handle,
      );

    throw new HttpException({ message, response }, status);
  }

  @Get('/by-handle')
  findOnCGSpace(@Query('handle') handle: string) {
    return this._resultsKnowledgeProductsService.findOnCGSpace(handle);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this._resultsKnowledgeProductsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultsKnowledgeProductDto: UpdateResultsKnowledgeProductDto,
  ) {
    return this._resultsKnowledgeProductsService.update(
      +id,
      updateResultsKnowledgeProductDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this._resultsKnowledgeProductsService.remove(+id);
  }
}
