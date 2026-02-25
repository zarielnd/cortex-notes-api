import { Module } from '@nestjs/common';
import { SelectionsService } from './selections.service';
import { SelectionsController } from './selections.controller';

@Module({
  controllers: [SelectionsController],
  providers: [SelectionsService],
})
export class SelectionsModule {}
