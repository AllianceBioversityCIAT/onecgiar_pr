import {
  Controller,
  Param,
  Delete,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { DeleteRecoverDataService } from './delete-recover-data.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class DeleteRecoverDataController {
  constructor(
    private readonly deleteRecoverDataService: DeleteRecoverDataService,
  ) {}

  @Delete('result/:id/delete')
  deleteResult(@Param('id') id: string, @UserToken() user: TokenDto) {
    return this.deleteRecoverDataService.deleteResult(+id, user);
  }

  @Patch('change/result/:id/type/:type')
  changeResultType(
    @Param('id') result_id: string,
    @Param('type') new_result_type_id: string,
    @UserToken() user: TokenDto,
  ) {}
}

