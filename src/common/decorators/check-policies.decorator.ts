import { SetMetadata } from '@nestjs/common';
import { PolicyHandler } from 'src/infrastructure/casl/types/policy-handler.type';

export const CHECK_POLICIES_KEY = 'check_policy';

export const CheckPolicies = (
  ...handlers: PolicyHandler[]
): ReturnType<typeof SetMetadata> => SetMetadata(CHECK_POLICIES_KEY, handlers);
