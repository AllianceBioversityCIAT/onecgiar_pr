import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { VersioningService } from './versioning.service';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';
import { UseInterceptors, UseGuards } from '@nestjs/common';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  ModuleTypeEnum,
  RoleEnum,
  RoleTypeEnum,
  StatusPhaseEnum,
} from '../../shared/constants/role-type.enum';
import { ValidRoleGuard } from '../../shared/guards/valid-role.guard';

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
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  create(
    @Body() createVersioningDto: CreateVersioningDto,
    @UserToken() user: TokenDto,
  ) {
    return this.versioningService.create(user, createVersioningDto);
  }

  @Patch(':id')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  update(
    @Param('id') id: string,
    @Body() updateVersioningDto: UpdateVersioningDto,
  ) {
    return this.versioningService.update(+id, updateVersioningDto);
  }

  @Get()
  find(
    @Query('module') module_type: ModuleTypeEnum = ModuleTypeEnum.ALL,
    @Query('status') status: StatusPhaseEnum = StatusPhaseEnum.OPEN,
  ) {
    return this.versioningService.find(module_type, status);
  }

  @Get('result/:resultId')
  findVersionOfAResult(@Param('resultId') result_id: string) {
    return this.versioningService.getVersionOfAResult(+result_id);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  remove(@Param('id') id: string) {
    return this.versioningService.delete(+id);
  }
}
