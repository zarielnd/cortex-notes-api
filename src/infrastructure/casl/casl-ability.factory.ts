import {
  AbilityBuilder,
  createMongoAbility,
  ExtractSubjectType,
  MongoAbility,
} from '@casl/ability';
import { Action } from './actions.enum';
import { User } from 'src/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { Subjects } from './casl.types';

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User): AppAbility {
    const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
    const { can, cannot, build } = builder;

    const allPermissions = user.roles.flatMap((role) => role.permissions);
    const permissionNames = allPermissions.map((perm) => perm.name);

    if (permissionNames.includes('all:manage')) {
      can(Action.Manage, 'all');
    } else {
      for (const permission of allPermissions) {
        const action = permission.action as Action;
        const subject = permission.subject as Subjects;
        can(action, subject);
      }
    }
    if (user.status !== 'active') {
      cannot(Action.Manage, 'all');
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
