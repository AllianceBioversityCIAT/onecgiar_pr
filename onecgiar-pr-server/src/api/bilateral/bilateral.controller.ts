import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import { ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { CreateBilateralDto } from './dto/create-bilateral.dto';

@Controller()
@ApiTags('Bilaterals')
@UseInterceptors(ResponseInterceptor)
export class BilateralController {
  constructor(private readonly bilateralService: BilateralService) {}

    @Post('create')
    create(
      @Body() bilateralDto: CreateBilateralDto
    ) {
      return this.bilateralService.create(
        bilateralDto
      );
    }
}
