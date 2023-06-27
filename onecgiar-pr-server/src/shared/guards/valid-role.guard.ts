import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import 'reflect-metadata';
import { TokenDto } from '../globalInterfaces/token.dto';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { RoleEnum, RoleTypeEnum } from '../constants/role-type.enum';

@Injectable()
export class ValidRoleGuard implements CanActivate {
  constructor(
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const data = this.reflector.get<{ roles: RoleEnum; type: RoleTypeEnum }>(
      'role',
      context.getHandler(),
    );
    const request = context.switchToHttp().getRequest();
    const token = this.processUserToken(request.headers['auth']);
    const role = await this._roleByUserRepository.$_isValidRole(
      token.id,
      data?.type,
    );

    if (role && role <= data?.roles) {
      return true;
    } else {
      return false;
    }
  }

  private processUserToken(headerValue: string): TokenDto {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(headerValue.split('.')[1], 'base64').toString())
    );
    return token;
  }
}
