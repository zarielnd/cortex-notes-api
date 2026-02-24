import { InferSubjects } from '@casl/ability';
import { User } from 'src/entities/user.entity';

export type Subjects = InferSubjects<typeof User> | 'all';
