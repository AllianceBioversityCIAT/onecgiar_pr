import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { VersioningService } from './versioning.service';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';
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
import { ChangePhaseDto } from './dto/change-phase.dto';

@ApiTags('Versioning')
@UseInterceptors(ResponseInterceptor)
@Controller()
export class VersioningController {
  constructor(private readonly versioningService: VersioningService) {}

  @Patch('phase-change/process/result/:resultId')
  @ApiOperation({ summary: 'Process phase change for a result' })
  @ApiParam({ name: 'resultId', type: Number, required: true })
  @ApiQuery({
    name: 'version',
    type: String,
    required: false,
    description: 'API version (e.g. v2)',
  })
  @ApiHeader({
    name: 'auth',
    description: 'JWT token for authentication',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    type: ChangePhaseDto,
    required: false,
    description: 'Optional entityId for version 2',
    examples: {
      default: {
        summary: 'Example body for version 2',
        value: {
          entityId: 123,
        },
      },
    },
  })
  async phaseChangeProcess(
    @Param('resultId') result_id: string,
    @UserToken() user: TokenDto,
    @Req() req: Request,
    @Body() body: ChangePhaseDto,
  ) {
    const apiVersion = req['apiVersion'];
    console.log("🚀 ~ VersioningController ~ phaseChangeProcess ~ apiVersion:", apiVersion)
    const entity_id = body?.entityId;
    console.log("🚀 ~ VersioningController ~ phaseChangeProcess ~ entity_id:", entity_id)
    if (apiVersion !== 'v2') {
      return this.versioningService.versionProcess(+result_id, user);
    } else {
      return this.versioningService.versionProcessV2(
        +result_id,
        entity_id,
        user,
      );
    }
  }

  @Post()
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Create a new versioning phase' })
  @ApiBody({ type: CreateVersioningDto })
  create(
    @Body() createVersioningDto: CreateVersioningDto,
    @UserToken() user: TokenDto,
  ) {
    return this.versioningService.create(user, createVersioningDto);
  }

  @Patch(':id')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Update a versioning phase' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateVersioningDto })
  update(
    @Param('id') id: string,
    @Body() updateVersioningDto: UpdateVersioningDto,
  ) {
    return this.versioningService.update(+id, updateVersioningDto);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all phases' })
  findAll() {
    return this.versioningService.getAllPhases();
  }

  @Patch('execute/annual/replicate/result')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Replicate annual results' })
  updateAnnuallyResult(@UserToken() user: TokenDto) {
    return this.versioningService.annualReplicationProcessInnovationDev(user);
  }

  @Patch('execute/annual/replicate/innovation-package')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Replicate annual innovation packages (IPSR)' })
  updateAnnuallyIPSR(@UserToken() user: TokenDto) {
    return this.versioningService.annualReplicationProcessInnovationPackage(
      user,
    );
  }

  @Patch('change/status/qa')
  @ApiOperation({ summary: 'Update QA status for results' })
  @ApiBody({ type: UpdateQaResults })
  updateStatusQa(@Body() QaResults: UpdateQaResults) {
    return this.versioningService.setQaStatus(QaResults);
  }

  @Patch('update/links-result/qa')
  @ApiOperation({ summary: 'Update QA links for results' })
  updateLinksQa() {
    return this.versioningService.updateLinkResultQa();
  }

  @Get('number/results/status/:statusId/result-type/:resultTypeId')
  @ApiOperation({ summary: 'Get number of results by status and type' })
  @ApiParam({ name: 'statusId', type: Number })
  @ApiParam({ name: 'resultTypeId', type: Number })
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
  @ApiOperation({ summary: 'Find phases by module, status and active' })
  @ApiQuery({ name: 'module', enum: ModuleTypeEnum, required: false })
  @ApiQuery({ name: 'status', enum: StatusPhaseEnum, required: false })
  @ApiQuery({ name: 'active', enum: ActiveEnum, required: false })
  find(
    @Query('module') module_type: ModuleTypeEnum = ModuleTypeEnum.ALL,
    @Query('status') status: StatusPhaseEnum = StatusPhaseEnum.OPEN,
    @Query('active') active: ActiveEnum = ActiveEnum.ACTIVE,
  ) {
    return this.versioningService.find(module_type, status, active);
  }

  @Get('result/:resultId')
  @ApiOperation({ summary: 'Get version of a specific result' })
  @ApiParam({ name: 'resultId', type: Number })
  findVersionOfAResult(@Param('resultId') result_id: string) {
    return this.versioningService.getVersionOfAResult(+result_id);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  @ApiOperation({ summary: 'Delete a versioning phase' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id') id: string) {
    return this.versioningService.delete(+id);
  }
}
