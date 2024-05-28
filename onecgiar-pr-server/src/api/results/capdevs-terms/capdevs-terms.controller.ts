import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CapdevsTermsService } from './capdevs-terms.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class CapdevsTermsController {
  constructor(private readonly capdevsTermsService: CapdevsTermsService) {}

  @Get('get/all')
  findAll() {
    return this.capdevsTermsService.findAll();
  }
}
