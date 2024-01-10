import {
  Controller,
  Param,
  Delete,
  Patch,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { DeleteRecoverDataService } from './delete-recover-data.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { ChangeResultTypeDto } from './prms-tables-types/dto/change-result-type.dto';

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

  @Patch('change/result/:id')
  changeResultType(
    @Param('id') result_id: string,
    @UserToken() user: TokenDto,
    @Body() ChangeResultTypeData: ChangeResultTypeDto,
  ) {
    return this.deleteRecoverDataService.changeResultType(
      +result_id,
      +ChangeResultTypeData?.result_level_id,
      +ChangeResultTypeData?.result_type_id,
      ChangeResultTypeData?.justification,
      user,
      true,
      ChangeResultTypeData?.new_name,
    );
  }
}
