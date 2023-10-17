import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';
import { CreateClarisaGeographicScopeDto } from './dto/create-clarisa-geographic-scope.dto';
import { UpdateClarisaGeographicScopeDto } from './dto/update-clarisa-geographic-scope.dto';

@Controller()
export class ClarisaGeographicScopesController {
  constructor(
    private readonly clarisaGeographicScopesService: ClarisaGeographicScopesService,
  ) {}

  @Get('get/all/prms')
  async findAll() {
    const { message, response, status } =
      await this.clarisaGeographicScopesService.findAllPRMS();
    throw new HttpException({ message, response }, status);
  }
}
