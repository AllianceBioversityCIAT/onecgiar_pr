import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import { ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { RootResultsDto } from './dto/create-bilateral.dto';

@Controller()
@ApiTags('Bilaterals')
@UseInterceptors(ResponseInterceptor)
export class BilateralController {
  constructor(private readonly bilateralService: BilateralService) {}

  @Post('create')
  async create(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    body: RootResultsDto,
  ) {
    return this.bilateralService.create(body);
  }
}
