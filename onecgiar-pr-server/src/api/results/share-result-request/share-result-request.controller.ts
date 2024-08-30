import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ShareResultRequestService } from './share-result-request.service';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Share Result Request')
@ApiHeader({
  name: 'auth',
  description: 'the token we need for auth.',
})
@Controller()
@UseInterceptors(ResponseInterceptor)
export class ShareResultRequestController {
  constructor(
    private readonly shareResultRequestService: ShareResultRequestService,
  ) {}

  @Post('create/:resultId')
  @ApiOperation({ summary: 'Create a new share result request' })
  @ApiParam({
    name: 'resultId',
    type: 'number',
    description: 'ID of the result',
  })
  @ApiBody({ type: CreateTocShareResult })
  @ApiResponse({ status: 201, description: 'Request successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  createRequest(
    @Body() createTocShareResult: CreateTocShareResult,
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    return this.shareResultRequestService.resultRequest(
      createTocShareResult,
      resultId,
      user,
    );
  }

  @Get('get/received')
  @ApiOperation({ summary: 'Get all share result requests by user' })
  @ApiResponse({
    status: 200,
    description: 'List of all share result requests by user.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseInterceptors(ResponseInterceptor)
  findReceived(@UserToken() user: TokenDto) {
    return this.shareResultRequestService.getReceivedResultRequest(user);
  }

  @Get('get/sent')
  @ApiOperation({ summary: 'Get all share result requests by user' })
  @ApiResponse({
    status: 200,
    description: 'List of all share result requests by user.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseInterceptors(ResponseInterceptor)
  findSent(@UserToken() user: TokenDto) {
    return this.shareResultRequestService.getSentResultRequest(user);
  }

  @Get('get/all')
  @ApiOperation({ summary: 'Get all share result requests by user' })
  @ApiResponse({
    status: 200,
    description: 'List of all share result requests by user.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseInterceptors(ResponseInterceptor)
  findAll(@UserToken() user: TokenDto) {
    return this.shareResultRequestService.getResultRequestByUser(user);
  }

  @Patch('update')
  @ApiOperation({ summary: 'Update a share result request' })
  @ApiBody({ type: CreateShareResultRequestDto })
  @ApiResponse({ status: 200, description: 'Request successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  updateRequest(
    @UserToken() user: TokenDto,
    @Body() createShareResultsRequestDto: CreateShareResultRequestDto,
  ) {
    return this.shareResultRequestService.updateResultRequestByUser(
      createShareResultsRequestDto,
      user,
    );
  }
}
