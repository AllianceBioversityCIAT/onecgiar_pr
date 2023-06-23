import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { VersioningService } from './versioning.service';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';
import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class VersioningController {
  constructor(private readonly versioningService: VersioningService) {}

  @Patch('phase-change/process/result/:resultId')
  phaseChangeProcess(
    @Param('resultId') result_id: string,
    @UserToken() user: TokenDto,
  ) {
    return this.versioningService.versionProcess(+result_id, user);
  }

  @Post()
  create(@Body() createVersioningDto: CreateVersioningDto) {
    return this.versioningService.create(createVersioningDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVersioningDto: UpdateVersioningDto,
  ) {
    return this.versioningService.update(+id, updateVersioningDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.versioningService.delete(+id);
  }
}
