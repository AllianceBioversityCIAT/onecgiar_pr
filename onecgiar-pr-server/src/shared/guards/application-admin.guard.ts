import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';

/**
 * Lets only platform (application) administrators through.
 *
 * It trusts `request.user`, which `JwtMiddleware` sets after verifying the token
 * signature, and never decodes the raw `auth` header itself. Routes using it must
 * therefore also be covered by `JwtMiddleware`; without a verified session the
 * request is refused with 401.
 */
@Injectable()
export class ApplicationAdminGuard implements CanActivate {
  constructor(private readonly roleByUserRepository: RoleByUserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request?.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authorization token is required');
    }

    const isAdmin = await this.roleByUserRepository.isUserAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenException(
        'Only application administrators can perform this action',
      );
    }

    return true;
  }
}
