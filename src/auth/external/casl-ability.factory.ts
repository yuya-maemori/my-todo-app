import { Injectable } from '@nestjs/common';
import { AbilityBuilder, PureAbility } from '@casl/ability';
import { createPrismaAbility, PrismaQuery, Subjects } from '@casl/prisma';
import { Todo } from '@prisma/client';
import { UserJwtPayload } from '../types';

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';

type AppSubjects = Subjects<{ Todo: Todo }> | 'all';

export type AppAbility = PureAbility<[Action, AppSubjects], PrismaQuery>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: UserJwtPayload): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    if (user.role === 'admin') {
      can('manage', 'all');
    } else {
      can('read', 'Todo', { userId: user.sub });
      can('create', 'Todo', { userId: user.sub });
      can('update', 'Todo', { userId: user.sub });
      can('delete', 'Todo', { userId: user.sub });
    }

    return build();
  }
}
