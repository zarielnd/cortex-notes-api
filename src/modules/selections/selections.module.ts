import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { Selection } from 'src/entities/selection.entity';
import { User } from 'src/entities/user.entity';
import { CaslModule } from 'src/infrastructure/casl/casl.module';
import { MailModule } from '../mail/mail.module';
import { SelectionsController } from './selections.controller';
import { SelectionsService } from './selections.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Selection, SelectionMember, User]),
    MailModule,
    CaslModule,
  ],
  controllers: [SelectionsController],
  providers: [SelectionsService],
  exports: [SelectionsService],
})
export class SelectionsModule {}
