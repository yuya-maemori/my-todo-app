import { SetMetadata } from '@nestjs/common';
import { AppAbility } from '../external/casl-ability.factory';

export type PolicyHandler = (ability: AppAbility) => boolean;

export const CHECK_POLICY_KEY = 'check_policy';
export const CheckPolicy = (handler: PolicyHandler) =>
  SetMetadata(CHECK_POLICY_KEY, handler);
