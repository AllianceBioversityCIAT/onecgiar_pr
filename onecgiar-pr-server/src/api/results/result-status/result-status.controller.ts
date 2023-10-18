import { Controller } from '@nestjs/common';
import { ResultStatusService } from './result-status.service';

@Controller('result-status')
export class ResultStatusController {
  constructor(private readonly resultStatusService: ResultStatusService) {}
}
