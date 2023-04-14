import { Injectable } from '@nestjs/common';

@Injectable()
export class PublicReportService {
  findAll() {
    return `This action returns all publicReport`;
  }
}
