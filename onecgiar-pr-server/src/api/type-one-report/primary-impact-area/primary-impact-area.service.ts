import { Injectable } from '@nestjs/common';
import { CreatePrimaryImpactAreaDto } from './dto/create-primary-impact-area.dto';
import { UpdatePrimaryImpactAreaDto } from './dto/update-primary-impact-area.dto';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { PrimaryImpactAreaRepository } from './primary-impact-area.repository';
import { TokenDto } from 'src/shared/globalInterfaces/token.dto';

@Injectable()
export class PrimaryImpactAreaService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _primaryImpactAreaRepository: PrimaryImpactAreaRepository
  ){}
  async create(createPrimaryImpactAreaDto: CreatePrimaryImpactAreaDto, user: TokenDto) {
    
    return await this._primaryImpactAreaRepository.save(createPrimaryImpactAreaDto);
  }

  
}
