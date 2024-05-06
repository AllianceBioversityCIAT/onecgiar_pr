import { Controller, UseInterceptors } from '@nestjs/common';
import { ResultIpMeasuresService } from './result-ip-measures.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('result-ip-measures')
@UseInterceptors(ResponseInterceptor)
export class ResultIpMeasuresController {
  constructor(
    private readonly resultIpMeasuresService: ResultIpMeasuresService,
  ) {}
}
