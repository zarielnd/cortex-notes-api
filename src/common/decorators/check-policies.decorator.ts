import { SetMetadata } from "@nestjs/common";

export const CHECK_POLICIES_KEY = 'check_policy';
export const CheckPolicies = (
  handler: Function,
): ReturnType<typeof SetMetadata> => SetMetadata(CHECK_POLICIES_KEY, handler);

