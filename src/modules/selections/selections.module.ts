import { Module } from '@nestjs/common';
import { SelectionsService } from './selections.service';
import { SelectionsController } from './selections.controller';
import { MailModule } from '../mail/mail.module';
import { User } from 'src/entities/user.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Selection, SelectionMember, User]),
    MailModule,
  ],
  controllers: [SelectionsController],
  providers: [SelectionsService],
  exports: [SelectionsService],
})
export class SelectionsModule {}
