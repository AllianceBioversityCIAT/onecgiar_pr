import { Body, Controller, HttpException, Post, Req } from '@nestjs/common';
import { ElasticService } from './elastic.service';
import rawbody from 'raw-body';

@Controller('elastic')
export class ElasticController {
  constructor(private readonly _elasticService: ElasticService) {}

  @Post('send')
  async sendBulkOperationToElastic(@Body() json: string, @Req() request) {
    let bodyString = '';
    if (request.readable) {
      // our request is really not a json, but a text, so we expect to always fall down this case
      const raw = await rawbody(request);
      bodyString = raw.toString();
    } else {
      // should not happen, but we handle it anyways
      bodyString = json;
    }

    const { message, response, status } =
      await this._elasticService.sendBulkOperationToElastic(bodyString);
    throw new HttpException({ message, response }, status);
  }

  @Post('reset')
  async resetElasticData() {
    const { message, response, status } =
      await this._elasticService.resetElasticData();
    throw new HttpException({ message, response }, status);
  }
}
