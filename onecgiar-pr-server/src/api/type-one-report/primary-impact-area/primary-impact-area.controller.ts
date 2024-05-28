import { Controller, Body, Patch, UseInterceptors } from '@nestjs/common';
import { PrimaryImpactAreaService } from './primary-impact-area.service';
import { TokenDto } from 'src/shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller('primary-impact-area')
@UseInterceptors(ResponseInterceptor)
export class PrimaryImpactAreaController {
  constructor(private readonly primaryImpactArea: PrimaryImpactAreaService) {}

  @Patch('create')
  mapResultLegacy(
    @Body() primaryImpactArea: any[],
    @UserToken() user: TokenDto,
  ) {
    return this.primaryImpactArea.create(primaryImpactArea, user);
  }
}
