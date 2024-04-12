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
  ActiveEnum,
  ModuleTypeEnum,
  RoleEnum,
  RoleTypeEnum,
  StatusPhaseEnum,
} from '../../shared/constants/role-type.enum';
import { ValidRoleGuard } from '../../shared/guards/valid-role.guard';
import { UpdateQaResults } from './dto/update-qa.dto';

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

  @Get('all')
  findAll() {
    return this.versioningService.getAllPhases();
  }

  @Patch('execute/annual/replicate/result')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  updateAnnuallyResult(@UserToken() user: TokenDto) {
    return this.versioningService.annualReplicationProcessInnovationDev(user);
  }

  @Patch('execute/annual/replicate/innovation-package')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  updateAnnuallyIPSR(@UserToken() user: TokenDto) {
    return this.versioningService.annualReplicationProcessInnovationPackage(user);
  }

  @Patch('change/status/qa')
  updateStatusQa(@Body() QaResults: UpdateQaResults) {
    return this.versioningService.setQaStatus(QaResults);
  }

  @Patch('update/links-result/qa')
  updateLinksQa() {
    return this.versioningService.updateLinkResultQa();
  }

  @Get('number/results/status/:statusId/result-type/:resultTypeId')
  getNumberResults(
    @Param('statusId') status_id: string,
    @Param('resultTypeId') result_type_id: string,
  ) {
    return this.versioningService.getNumberRresultsReplicated(
      +status_id,
      +result_type_id,
    );
  }

  @Get()
  find(
    @Query('module') module_type: ModuleTypeEnum = ModuleTypeEnum.ALL,
    @Query('status') status: StatusPhaseEnum = StatusPhaseEnum.OPEN,
    @Query('active') active: ActiveEnum = ActiveEnum.ACTIVE,
  ) {
    return this.versioningService.find(module_type, status, active);
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
