import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpException,
} from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';

@Controller()
export class ResultsTocResultsController {
  constructor(
    private readonly resultsTocResultsService: ResultsTocResultsService,
  ) {}

  @Post('create/toc/result/:resultId')
  async create(
    @Body() createResultsTocResultDto: CreateResultsTocResultDto,
    @Headers() auth: HeadersDto,
    @Param('resultId') resultId: number,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    createResultsTocResultDto.result_id = resultId;
    const { message, response, status } =
      await this.resultsTocResultsService.create(
        createResultsTocResultDto,
        token,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get()
  findAll() {
    return this.resultsTocResultsService.findAll();
  }

  @Get('get/result/:resultId')
  async finTocByResult(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.resultsTocResultsService.getTocByResult(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/indicator/:id/result/:resultId/initiative/:initiativeId')
  async findIndicatorByToc(
    @Param('id') id: number,
    @Param('resultId') resultId: number,
    @Param('initiativeId') initiativeId: number,
  ) {
    const { message, response, status } =
      await this.resultsTocResultsService.getTocResultIndicatorByResultTocId(
        resultId,
        id,
        initiativeId,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('get/result/:resultId/initiative/:initiativeId')
  async findActionResutl(
    @Param('resultId') resultId: number,
    @Param('initiativeId') initiativeId: number,
  ) {
    const { message, response, status } =
      await this.resultsTocResultsService.getActionAreaOutcomeByResultTocId(
        resultId,
        initiativeId,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('get/version/:resultId/initiative/:initiativeId/resultToc/:resultTocId')
  async findVersionDashBoard(
    @Param('resultId') resultId: number,
    @Param('initiativeId') initiativeId: number,
    @Param('resultTocId') _resultTocId: number,
  ) {
    //TODO: I cannot delete that value but I can accommodate it as an internal value,
    //since the url would have to be modified and that would have to be modified from the front as well
    const { message, response, status } =
      await this.resultsTocResultsService.getVersionId(resultId, initiativeId);
    throw new HttpException({ message, response }, status);
  }
}
