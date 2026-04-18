import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { SessionUser, UserRole } from "@latam-payouts/contracts";
import { DemoDomainService } from "../demo/demo-domain.service.js";

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest<{ user: SessionUser }>();
    return request.user;
  },
);

@Injectable()
export class DemoAuthGuard implements CanActivate {
  constructor(private readonly domain: DemoDomainService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      path?: string;
      user?: SessionUser;
    }>();
    const path = request.path ?? "";
    if (path === "/auth/login" || path === "/auth/refresh" || path.startsWith("/webhooks/")) {
      return true;
    }
    const authorization = request.headers.authorization;
    const headerUserId = request.headers["x-demo-user-id"];
    const token = authorization?.replace("Bearer ", "");
    const userId = token?.startsWith("demo-token:")
      ? token.replace("demo-token:", "")
      : headerUserId;
    const user = userId ? this.domain.findUserById(userId) : this.domain.getDefaultUser();

    if (!user) {
      throw new UnauthorizedException("Invalid demo session.");
    }

    request.user = user;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: SessionUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("Missing user context.");
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Insufficient role for this operation.");
    }

    return true;
  }
}
