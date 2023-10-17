import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaGeographicScopeDto } from './dto/create-clarisa-geographic-scope.dto';
import { UpdateClarisaGeographicScopeDto } from './dto/update-clarisa-geographic-scope.dto';
import { ClarisaGeographicScopeRepository } from './clarisa-geographic-scopes.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaGeographicScopesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaGeographicScopeRepository: ClarisaGeographicScopeRepository,
  ) {}

  async findAllPRMS() {
    try {
      const scopesPrms =
        await this._clarisaGeographicScopeRepository.getAllPRMSScopes();
      return {
        response: scopesPrms,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes(error);
    }
  }
}
