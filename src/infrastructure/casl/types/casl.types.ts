import { InferSubjects } from '@casl/ability';
import { Note } from 'src/entities/note.entity';
import { Selection } from 'src/entities/selection.entity';
import { User } from 'src/entities/user.entity';

export type Subjects = InferSubjects<
  typeof User | typeof Note | typeof Selection | 'all'
>;
