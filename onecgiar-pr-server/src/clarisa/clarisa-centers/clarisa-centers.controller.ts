import {
  Controller,
  Get,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { ClarisaCentersService } from './clarisa-centers.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaCentersController {
  constructor(private readonly clarisaCentersService: ClarisaCentersService) {}

  @Get('get/all')
  findAll() {
    return this.clarisaCentersService.findAll();
  }
}
