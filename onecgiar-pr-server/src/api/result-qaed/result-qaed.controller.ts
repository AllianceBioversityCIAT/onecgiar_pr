import { Controller } from '@nestjs/common';
import { ResultQaedService } from './result-qaed.service';

@Controller('result-qaed')
export class ResultQaedController {
  constructor(private readonly resultQaedService: ResultQaedService) {}
}
