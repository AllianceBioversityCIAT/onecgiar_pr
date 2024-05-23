import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ElasticService } from './elastic.service';
import rawbody from 'raw-body';
import { ValidRoleGuard } from '../shared/guards/valid-role.guard';
import { RoleEnum, RoleTypeEnum } from '../shared/constants/role-type.enum';
import { Roles } from '../shared/decorators/roles.decorator';
import { ResponseInterceptor } from '../shared/Interceptors/Return-data.interceptor';

@Controller('elastic')
@UseInterceptors(ResponseInterceptor)
export class ElasticController {
  constructor(private readonly _elasticService: ElasticService) {}

  @Post('send')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
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

    return this._elasticService.sendBulkOperationToElastic([bodyString]);
  }

  @Post('reset')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  resetElasticData() {
    return this._elasticService.resetElasticData();
  }
}
