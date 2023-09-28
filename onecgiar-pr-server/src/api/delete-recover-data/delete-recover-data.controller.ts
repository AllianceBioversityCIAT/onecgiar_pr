import { Controller, Param, Delete, UseInterceptors } from '@nestjs/common';
import { DeleteRecoverDataService } from './delete-recover-data.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class DeleteRecoverDataController {
  constructor(
    private readonly deleteRecoverDataService: DeleteRecoverDataService,
  ) {}

  @Delete('result/:id/delete')
  deleteResult(@Param('id') id: string) {
    return this.deleteRecoverDataService.deleteResult(+id);
  }
}
