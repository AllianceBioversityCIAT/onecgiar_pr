import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsKnowledgeProductDto } from './dto/results-knowledge-product.dto';
import { ResultsKnowledgeProductSaveDto } from './dto/results-knowledge-product-save.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { FilterDto } from './dto/filter.dto';
import { CgspaceDiscoveryService } from './cgspace-discovery/cgspace-discovery.service';
import { CgspaceSearchQueryDto } from './cgspace-discovery/dto/cgspace-search-query.dto';
import { CgspaceFacetQueryDto } from './cgspace-discovery/dto/cgspace-facet-query.dto';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsKnowledgeProductsController {
  constructor(
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
    private readonly _cgspaceDiscoveryService: CgspaceDiscoveryService,
  ) {}

  @ApiTags('Knowledge Products - CGSpace')
  @ApiOperation({
    summary: 'Search CGSpace (DSpace 7 discovery) for knowledge products',
    description:
      'Proxies the CGSpace discovery search. `query` (3-200 chars) is required unless at least one of `type`, `year`, `center` is set. `size` is capped at 25. Unknown query params are rejected with 400.',
  })
  @Get('cgspace/search')
  cgspaceSearch(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: CgspaceSearchQueryDto,
  ) {
    return this._cgspaceDiscoveryService.search(query);
  }

  @ApiTags('Knowledge Products - CGSpace')
  @ApiOperation({
    summary: 'List CGSpace facet values (item type or affiliation)',
    description:
      'Proxies a CGSpace discovery facet. `size` is capped at 100. Unknown query params are rejected with 400.',
  })
  @ApiParam({
    name: 'name',
    enum: ['itemtype', 'affiliation'],
    description: 'CGSpace facet name',
  })
  @Get('cgspace/facets/:name')
  cgspaceFacets(
    @Param('name') name: string,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: CgspaceFacetQueryDto,
  ) {
    return this._cgspaceDiscoveryService.facets(name, query);
  }

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
  getFromMQAPByHandle(
    @Query('handle') handle: string,
    @UserToken() user: TokenDto,
  ) {
    return this._resultsKnowledgeProductsService.findOnCGSpace(
      handle,
      user,
      null,
    );
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
