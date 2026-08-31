import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@licoreria/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';

// Autorización por rol: el backend es quien autoriza,
// aunque el frontend oculte botones/rutas por UX.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tiene permisos para esta operación');
    }
    return true;
  }
}
