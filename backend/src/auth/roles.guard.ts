import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/users.entity';
import { ROLES_KEY } from './roles.decorator';
import { AUTH_I18N, AuthLangType } from './auth.i18n';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const lang: AuthLangType = request.query?.lang || 'ua';

    if (!user || !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(AUTH_I18N[lang].forbidden);
    }

    return true;
  }
}
