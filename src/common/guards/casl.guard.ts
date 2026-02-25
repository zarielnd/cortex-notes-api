import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import {
  AppAbility,
  CaslAbilityFactory,
} from 'src/infrastructure/casl/casl-ability.factory';
import { PolicyHandler } from 'src/infrastructure/casl/types/policy-handler.type';
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import { Request } from 'express';
import { User } from 'src/entities/user.entity';

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) ?? [];

    const policyHandlers = Array.isArray(handlers) ? handlers : [handlers];

    if (!policyHandlers.length) {
      return true; // No policies means open access
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as User;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    const isAllowed = policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability),
    );
    if (!isAllowed) {
      throw new ForbiddenException('Access denied');
    }
    return isAllowed;
  }

  private execPolicyHandler(
    handler: PolicyHandler,
    ability: AppAbility,
  ): boolean {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
