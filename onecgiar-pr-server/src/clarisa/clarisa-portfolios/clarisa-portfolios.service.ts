import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClarisaPortfolios } from './entities/clarisa-portfolios.entity';
import { ClarisaPortfoliosRepository } from './clarisa-portfolios.repository';
import { In } from 'typeorm';

@Injectable()
export class ClarisaPortfoliosService {
  constructor(
    private readonly _clarisaPortfoliosRepository: ClarisaPortfoliosRepository,
  ) {}

  async findAll(): Promise<ClarisaPortfolios[]> {
    return this._clarisaPortfoliosRepository.find({
      where: {
        id: In([2, 3]),
      },
    });
  }
}
