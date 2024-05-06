import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ResultFoldersService } from './result-folders.service';
import { CreateResultFolderDto } from './dto/create-result-folder.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { Roles } from '../../../shared/decorators/roles.decorator';
import {
  RoleEnum,
  RoleTypeEnum,
} from '../../../shared/constants/role-type.enum';
import { ValidRoleGuard } from '../../../shared/guards/valid-role.guard';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateResultFolderTypeDto } from './dto/create-result-folder-type.dto';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultFoldersController {
  constructor(private readonly resultFoldersService: ResultFoldersService) {}

  @Post()
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  createResultFolder(
    @Body() createResultFolderDto: CreateResultFolderDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultFoldersService.createResultFolder(
      user,
      createResultFolderDto,
    );
  }

  @Post('type')
  @Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)
  @UseGuards(ValidRoleGuard)
  createResultFolderType(
    @Body() createResultFolderTypeDto: CreateResultFolderTypeDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultFoldersService.createResultFolderType(
      user,
      createResultFolderTypeDto,
    );
  }

  @Get()
  findResultFolder(
    @Query('type') type: string,
    @Query('status') status: string,
    @Query('id') id: string,
    @Query('phase') phase: string,
  ) {
    return this.resultFoldersService.findResultFolders(
      type,
      status,
      +id,
      +phase,
    );
  }

  @Get('type')
  findResultFolderType(
    @Query('status') status: string,
    @Query('id') id: string,
  ) {
    return this.resultFoldersService.findResultFoldersType(status, +id);
  }
}
