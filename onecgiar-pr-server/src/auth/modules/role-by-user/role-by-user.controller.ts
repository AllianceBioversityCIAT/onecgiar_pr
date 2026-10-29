import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RoleByUserService } from './role-by-user.service';
import { CreateRoleByUserDto } from './dto/create-role-by-user.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ApplicationAdminGuard } from '../../../shared/guards/application-admin.guard';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class RoleByUserController {
  constructor(private readonly roleByUserService: RoleByUserService) {}

  @Post()
  @UseGuards(ApplicationAdminGuard)
  create(
    @Body() createRoleByUserDto: CreateRoleByUserDto,
    @UserToken() user: TokenDto,
  ) {
    return this.roleByUserService.create(createRoleByUserDto, user);
  }

  @Get('get/user/:id')
  findAll(@Param('id') userId: number) {
    return this.roleByUserService.allRolesByUser(userId);
  }
}
