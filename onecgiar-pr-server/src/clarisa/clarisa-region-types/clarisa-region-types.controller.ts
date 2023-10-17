import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaRegionTypesService } from './clarisa-region-types.service';
import { CreateRegionTypeDto } from './dto/create-region-type.dto';
import { UpdateRegionTypeDto } from './dto/update-region-type.dto';

@Controller('clarisa-region-types')
export class ClarisaRegionTypesController {
  constructor(private readonly regionTypesService: ClarisaRegionTypesService) {}
}
